'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHmac, timingSafeEqual } = require('node:crypto');
const Stripe = require('stripe');
const ROOT = path.resolve(__dirname, '..');
const SESSION = /^cs_test_[a-zA-Z0-9]+$/;

function configuration(env = process.env) {
  const origin = new URL(env.STORE_ORIGIN || 'http://127.0.0.1:4180');
  if (origin.pathname !== '/' || origin.search || origin.hash || origin.username || origin.password)
    throw new Error('STORE_ORIGIN must be an origin without a path or credentials.');
  if (
    origin.protocol !== 'https:' &&
    !(origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname))
  )
    throw new Error('Use HTTPS except for loopback development.');
  if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith('sk_test_'))
    throw new Error('This release supports Stripe test keys only. Live payments are not enabled.');
  return {
    origin: origin.origin,
    key: env.STRIPE_SECRET_KEY,
    price: env.STRIPE_PRICE_ID,
    webhook: env.STRIPE_WEBHOOK_SECRET,
    signing: env.DOWNLOAD_SIGNING_SECRET,
    orders: path.resolve(env.ORDER_DIRECTORY || path.join(ROOT, '.store-data')),
    archive: path.resolve(env.GAME_ARCHIVE || path.join(ROOT, 'release/last-train-ledger.zip')),
  };
}
function tokenFor(id, secret) {
  return createHmac('sha256', secret).update(`download:${id}`).digest('hex');
}
function tokenValid(id, token, secret) {
  return (
    typeof token === 'string' &&
    /^[a-f0-9]{64}$/.test(token) &&
    timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(tokenFor(id, secret), 'hex'))
  );
}
async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 65536) throw Object.assign(new Error('Request too large'), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
async function verifyPurchase(config, stripe, id) {
  if (!SESSION.test(id)) fail(400, 'Invalid test checkout reference.');
  const session = await stripe.checkout.sessions.retrieve(id, { expand: ['line_items'] });
  const lines = session.line_items;
  if (
    session.livemode !== false ||
    session.mode !== 'payment' ||
    session.metadata?.game !== 'last-train-ledger' ||
    session.payment_status !== 'paid' ||
    session.status !== 'complete' ||
    lines?.has_more ||
    lines?.data?.length !== 1 ||
    lines.data[0].price?.id !== config.price ||
    lines.data[0].quantity !== 1
  )
    fail(409, 'Payment is not confirmed for this game.');
  if (!session.payment_intent) fail(409, 'Payment is not confirmed.');
  const payment = await stripe.paymentIntents.retrieve(session.payment_intent, {
    expand: ['latest_charge'],
  });
  const charge = payment.latest_charge;
  if (
    payment.status !== 'succeeded' ||
    !charge ||
    typeof charge === 'string' ||
    charge.refunded ||
    charge.amount_refunded > 0 ||
    charge.disputed
  )
    fail(409, 'This payment is not eligible for a download.');
  return session;
}

function createStore(config, client) {
  const stripe =
    client ||
    (config.key ? new Stripe(config.key, { maxNetworkRetries: 2, timeout: 15000 }) : null);
  const ready = Boolean(stripe && config.price && config.webhook && config.signing?.length >= 32);
  const windows = new Map();
  const fail = (status, message) => {
    throw Object.assign(new Error(message), { status });
  };
  async function fulfill(id) {
    await verifyPurchase(config, stripe, id);
    await fs.mkdir(config.orders, { recursive: true, mode: 0o700 });
    // Unique temporary files plus atomic rename: simultaneous webhook and redirect
    // requests produce the same entitlement, never a partially readable record.
    const temp = path.join(config.orders, `${id}.${require('node:crypto').randomUUID()}.tmp`);
    try {
      await fs.writeFile(temp, JSON.stringify({ session: id, game: 'last-train-ledger' }), {
        mode: 0o600,
      });
      await fs.rename(temp, path.join(config.orders, `${id}.json`));
    } finally {
      await fs.rm(temp, { force: true });
    }
    return `/api/download?session_id=${id}&token=${tokenFor(id, config.signing)}`;
  }
  function limit(req) {
    const now = Date.now();
    for (const [key, record] of windows) if (record.until < now) windows.delete(key);
    const key = req.socket.remoteAddress;
    const record = windows.get(key) || { count: 0, until: now + 60000 };
    if (++record.count > 30 || windows.size > 10000)
      fail(429, 'Too many requests. Try again in a minute.');
    windows.set(key, record);
  }
  return http.createServer(async (req, res) => {
    const json = (status, data) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );
    try {
      const url = new URL(req.url, config.origin);
      if (url.pathname.startsWith('/api/')) {
        if (url.pathname !== '/api/webhook') limit(req);
        if (req.method === 'GET' && url.pathname === '/api/config') {
          if (!ready) return json(200, { ready: false, testMode: true });
          const price = await stripe.prices.retrieve(config.price);
          if (
            price.livemode ||
            !price.active ||
            price.type !== 'one_time' ||
            price.currency !== 'eur' ||
            !Number.isInteger(price.unit_amount) ||
            price.unit_amount <= 0
          )
            fail(503, 'Configure an active, fixed EUR test price.');
          return json(200, {
            ready: true,
            testMode: true,
            amount: price.unit_amount,
            currency: price.currency,
          });
        }
        if (!ready) fail(503, 'Test checkout is not configured yet. The demo is available.');
        if (req.method === 'POST' && url.pathname === '/api/checkout') {
          if (req.headers.origin !== config.origin) fail(403, 'Invalid request origin.');
          await body(req);
          await fs.access(config.archive);
          const price = await stripe.prices.retrieve(config.price);
          if (
            price.livemode ||
            !price.active ||
            price.type !== 'one_time' ||
            price.currency !== 'eur' ||
            !Number.isInteger(price.unit_amount) ||
            price.unit_amount <= 0
          )
            fail(503, 'Configure an active, fixed EUR test price.');
          const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{ price: config.price, quantity: 1 }],
            metadata: { game: 'last-train-ledger' },
            success_url: `${config.origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${config.origin}/?checkout=cancelled`,
          });
          if (!session.url?.startsWith('https://checkout.stripe.com/'))
            fail(502, 'Invalid checkout destination.');
          return json(200, { url: session.url });
        }
        if (req.method === 'POST' && url.pathname === '/api/webhook') {
          const raw = await body(req);
          let event;
          try {
            event = stripe.webhooks.constructEvent(
              raw,
              req.headers['stripe-signature'],
              config.webhook,
            );
          } catch {
            fail(400, 'Invalid webhook signature.');
          }
          if (event.livemode !== false) fail(400, 'Live events are not accepted.');
          if (
            ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(
              event.type,
            )
          ) {
            const session = event.data.object;
            if (
              session.metadata?.game === 'last-train-ledger' &&
              session.payment_status === 'paid'
            ) {
              try {
                await fulfill(session.id);
              } catch (error) {
                if (error.status !== 409) throw error;
              }
            }
          }
          return json(200, { received: true });
        }
        if (req.method === 'GET' && url.pathname === '/api/order')
          return json(200, { download: await fulfill(url.searchParams.get('session_id') || '') });
        if (req.method === 'GET' && url.pathname === '/api/download') {
          const id = url.searchParams.get('session_id') || '';
          if (!SESSION.test(id) || !tokenValid(id, url.searchParams.get('token'), config.signing))
            fail(403, 'Invalid download link.');
          await verifyPurchase(config, stripe, id);
          await fs.access(path.join(config.orders, `${id}.json`));
          const data = await fs.readFile(config.archive);
          res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="last-train-ledger.zip"',
          });
          return res.end(data);
        }
        fail(404, 'Not found.');
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') fail(405, 'Method not allowed.');
      const routes = {
        '/': 'storefront/index.html',
        '/store.css': 'storefront/store.css',
        '/store.js': 'storefront/store.js',
        '/train.svg': 'storefront/train.svg',
        '/success.html': 'storefront/success.html',
        '/success.js': 'storefront/success.js',
        '/demo/': 'storefront/demo.html',
        '/demo/style.css': 'style.css',
        '/demo/engine.js': 'engine.js',
        '/demo/app.js': 'app.js',
      };
      const file = routes[url.pathname];
      if (!file) fail(404, 'Not found.');
      const data = await fs.readFile(path.join(ROOT, file));
      const type = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
      }[path.extname(file)];
      res.writeHead(200, { 'Content-Type': type });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      json(error.status || 503, {
        error: error.status
          ? error.message
          : 'Service temporarily unavailable. Please retry; do not purchase again.',
      });
    }
  });
}
if (require.main === module) {
  const config = configuration();
  createStore(config).listen(Number(process.env.PORT || 4180), '127.0.0.1', () =>
    console.log(`Store preview: ${config.origin} (test mode only)`),
  );
}
module.exports = { configuration, createStore, tokenFor, tokenValid, verifyPurchase };
