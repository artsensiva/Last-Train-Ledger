'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const nodemailer = require('nodemailer');
const Stripe = require('stripe');
const { configuration, verifyPurchase } = require('./server');
const ORDER = /^cs_test_[a-zA-Z0-9]+\.json$/;
const mailbox = (value) =>
  typeof value === 'string' && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
function mailConfiguration(env = process.env) {
  if (
    !env.SMTP_HOST ||
    !env.SMTP_USER ||
    !env.SMTP_PASSWORD ||
    !mailbox(env.MAIL_FROM) ||
    !mailbox(env.MAIL_TEST_TO)
  )
    throw new Error('Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD, MAIL_FROM and MAIL_TEST_TO.');
  const port = Number(env.SMTP_PORT || 465);
  if (![465, 587].includes(port)) throw new Error('SMTP_PORT must be 465 or 587 with TLS.');
  return {
    from: env.MAIL_FROM,
    testTo: env.MAIL_TEST_TO,
    transport: {
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: true,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      tls: { rejectUnauthorized: true },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
      disableFileAccess: true,
      disableUrlAccess: true,
    },
  };
}
async function writeState(file, data) {
  const temp = `${file}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temp, JSON.stringify(data), { mode: 0o600 });
    await fs.rename(temp, file);
  } finally {
    await fs.rm(temp, { force: true });
  }
}
async function readState(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return { attempts: 0, next: 0 };
    throw error;
  }
}
// One bounded pass. Run on a scheduler; the durable state survives restarts.
async function deliverPending(config, mail, stripe, transport, now = Date.now()) {
  if (!mailbox(mail.from) || !mailbox(mail.testTo))
    throw new Error('A valid test sender and recipient are required.');
  const directory = path.join(config.orders, 'mail');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const lock = path.join(directory, '.worker-lock');
  try {
    await fs.mkdir(lock, { mode: 0o700 });
  } catch (error) {
    if (error.code === 'EEXIST') return { busy: true, sent: 0, failed: 0, skipped: 0 };
    throw error;
  }
  const result = { busy: false, sent: 0, failed: 0, skipped: 0 };
  try {
    const files = (await fs.readdir(config.orders)).filter((name) => ORDER.test(name)).sort();
    let processed = 0;
    for (const file of files) {
      const id = file.slice(0, -5);
      const stateFile = path.join(directory, file);
      const state = await readState(stateFile);
      if (state.sentAt || state.blocked || state.next > now || processed >= 50) {
        result.skipped++;
        continue;
      }
      processed++;
      try {
        const order = JSON.parse(await fs.readFile(path.join(config.orders, file), 'utf8'));
        if (order.session !== id || order.game !== 'last-train-ledger')
          throw new Error('Invalid order record');
        await verifyPurchase(config, stripe, id);
        const recovery = `${config.origin}/success.html?session_id=${encodeURIComponent(id)}`;
        const receipt = await transport.sendMail({
          from: { name: 'Last Train Ledger', address: mail.from },
          // Sandbox payments must never trigger mail to arbitrary checkout addresses.
          to: { address: mail.testTo },
          messageId: `<${createHash('sha256').update(id).digest('hex')}@${mail.from.split('@')[1]}>`,
          subject: '[TEST] Your Last Train Ledger download',
          text: `This is a test delivery. No real purchase was made.\n\nYour game download and recovery page:\n${recovery}\n\nKeep this link private. It grants access to this test purchase.\nDownload the ZIP, extract it, and open index.html. Keep all four game files together.\n\nEvery ticket is a promise.\nLast Train Ledger`,
          disableFileAccess: true,
          disableUrlAccess: true,
        });
        if (!receipt.accepted?.includes(mail.testTo) || receipt.rejected?.length)
          throw new Error('SMTP did not accept the recipient');
        await writeState(stateFile, { attempts: state.attempts + 1, sentAt: now });
        result.sent++;
      } catch (error) {
        const attempts = state.attempts + 1;
        await writeState(stateFile, {
          attempts,
          next: now + Math.min(3600000, 60000 * 2 ** Math.min(attempts - 1, 6)),
          blocked: error.status === 409,
        });
        result.failed++;
      }
    }
    return result;
  } finally {
    await fs.rmdir(lock);
  }
}
async function main() {
  const config = configuration();
  if (!config.key || !config.price)
    throw new Error('Stripe test credentials and price are required.');
  const mail = mailConfiguration();
  const transport = nodemailer.createTransport(mail.transport);
  try {
    const result = await deliverPending(
      config,
      mail,
      new Stripe(config.key, { timeout: 15000, maxNetworkRetries: 2 }),
      transport,
    );
    console.log(JSON.stringify(result));
    if (result.failed || result.busy) process.exitCode = 1;
  } finally {
    transport.close();
  }
}
if (require.main === module)
  main().catch(() => {
    console.error(
      'Mail worker failed. Check configuration and private delivery state; no secrets are logged.',
    );
    process.exitCode = 1;
  });
module.exports = { mailConfiguration, deliverPending };
