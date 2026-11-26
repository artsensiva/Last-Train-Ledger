'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { deliverPending, mailConfiguration } = require('../commerce/mail-worker');
async function setup(t) {
  const orders = await fs.mkdtemp(path.join(os.tmpdir(), 'ledger-mail-'));
  t.after(() => fs.rm(orders, { recursive: true, force: true }));
  const id = 'cs_test_mail123';
  await fs.writeFile(
    path.join(orders, id + '.json'),
    JSON.stringify({ session: id, game: 'last-train-ledger' }),
  );
  const session = {
    livemode: false,
    mode: 'payment',
    status: 'complete',
    metadata: { game: 'last-train-ledger' },
    payment_status: 'paid',
    payment_intent: 'pi_test',
    customer_details: { email: 'never-send-here@example.com' },
    line_items: { data: [{ price: { id: 'price_test' }, quantity: 1 }], has_more: false },
  };
  const stripe = {
    checkout: { sessions: { retrieve: async () => session } },
    paymentIntents: {
      retrieve: async () => ({
        status: 'succeeded',
        latest_charge: { amount_refunded: 0, refunded: false, disputed: false },
      }),
    },
  };
  const config = { orders, origin: 'https://game.example', price: 'price_test' };
  const mail = { from: 'game@example.com', testTo: 'tester@example.com' };
  const messages = [];
  const transport = {
    sendMail: async (message) => {
      messages.push(message);
      return { accepted: [mail.testTo], rejected: [] };
    },
  };
  return { config, mail, stripe, transport, session, messages, id };
}
test('email worker sends one recoverable test link and survives repeated passes', async (t) => {
  const f = await setup(t);
  assert.equal((await deliverPending(f.config, f.mail, f.stripe, f.transport, 1000)).sent, 1);
  assert.equal((await deliverPending(f.config, f.mail, f.stripe, f.transport, 2000)).sent, 0);
  assert.deepEqual(f.messages[0].to, { address: 'tester@example.com' });
  assert.match(
    f.messages[0].text,
    /https:\/\/game.example\/success.html\?session_id=cs_test_mail123/,
  );
  assert.equal(f.messages[0].text.includes('never-send-here'), false);
});
test('SMTP failures persist retry backoff and recover in a later pass', async (t) => {
  const f = await setup(t);
  const broken = {
    sendMail: async () => {
      throw new Error('provider unavailable');
    },
  };
  assert.equal((await deliverPending(f.config, f.mail, f.stripe, broken, 1000)).failed, 1);
  assert.equal((await deliverPending(f.config, f.mail, f.stripe, f.transport, 2000)).sent, 0);
  assert.equal((await deliverPending(f.config, f.mail, f.stripe, f.transport, 61001)).sent, 1);
});
test('parallel workers do not concurrently deliver the same order', async (t) => {
  const f = await setup(t);
  const results = await Promise.all([
    deliverPending(f.config, f.mail, f.stripe, f.transport, 1000),
    deliverPending(f.config, f.mail, f.stripe, f.transport, 1000),
  ]);
  assert.equal(
    results.reduce((sum, r) => sum + r.sent, 0),
    1,
  );
  assert.equal(f.messages.length, 1);
});
test('unpaid orders are blocked before any email is sent', async (t) => {
  const f = await setup(t);
  f.session.payment_status = 'unpaid';
  assert.equal((await deliverPending(f.config, f.mail, f.stripe, f.transport, 1000)).failed, 1);
  assert.equal(f.messages.length, 0);
  assert.equal((await deliverPending(f.config, f.mail, f.stripe, f.transport, 100000)).skipped, 1);
});
test('SMTP requires encrypted connections and a single explicit test mailbox', () => {
  const env = {
    SMTP_HOST: 'smtp.example.com',
    SMTP_USER: 'user',
    SMTP_PASSWORD: 'secret',
    MAIL_FROM: 'sender@example.com',
    MAIL_TEST_TO: 'test@example.com',
  };
  assert.equal(mailConfiguration(env).transport.secure, true);
  assert.equal(mailConfiguration({ ...env, SMTP_PORT: '587' }).transport.requireTLS, true);
  assert.throws(() => mailConfiguration({ ...env, SMTP_PORT: '25' }));
  assert.throws(() => mailConfiguration({ ...env, MAIL_TEST_TO: 'a@example.com,b@example.com' }));
});
