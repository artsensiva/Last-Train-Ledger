'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Stripe = require('stripe');
const { configuration, createStore } = require('../commerce/server');
const id = 'cs_test_example123';
async function fixture(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ledger-store-'));
  const config = {
    origin: 'http://localhost',
    price: 'price_game',
    webhook: 'whsec_testing',
    signing: 'a'.repeat(40),
    orders: path.join(dir, 'orders'),
    archive: path.join(dir, 'game.zip'),
  };
  await fs.writeFile(config.archive, 'archive fixture');
  const session = {
    id,
    livemode: false,
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    metadata: { game: 'last-train-ledger' },
    line_items: { has_more: false, data: [{ price: { id: config.price }, quantity: 1 }] },
    payment_intent: 'pi_example',
  };
  const payment = {
    status: 'succeeded',
    latest_charge: { refunded: false, amount_refunded: 0, disputed: false },
  };
  const real = new Stripe('sk_test_fixture');
  let created;
  const client = {
    checkout: {
      sessions: {
        retrieve: async () => session,
        create: async (params) => {
          created = params;
          return { url: 'https://checkout.stripe.com/c/pay/cs_test_example123' };
        },
      },
    },
    paymentIntents: { retrieve: async () => payment },
    prices: {
      retrieve: async () => ({
        livemode: false,
        active: true,
        type: 'one_time',
        currency: 'eur',
        unit_amount: 499,
      }),
    },
    webhooks: real.webhooks,
  };
  const server = createStore(config, client);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true });
  });
  return {
    config,
    session,
    payment,
    client,
    base,
    request: (url, options) => fetch(base + url, options),
    created: () => created,
  };
}
test('live keys and nonlocal insecure origins fail closed', () => {
  assert.throws(() => configuration({ STRIPE_SECRET_KEY: 'sk_live_no' }), /test keys/);
  assert.throws(() => configuration({ STORE_ORIGIN: 'http://example.com' }), /HTTPS/);
  assert.throws(() => configuration({ STORE_ORIGIN: 'https://example.com/path' }), /origin/);
});
test('checkout uses server price and rejects foreign origins', async (t) => {
  const f = await fixture(t);
  assert.equal(
    (
      await f.request('/api/checkout', {
        method: 'POST',
        headers: { Origin: 'https://evil.example' },
      })
    ).status,
    403,
  );
  const response = await f.request('/api/checkout', {
    method: 'POST',
    headers: { Origin: f.config.origin },
    body: JSON.stringify({ price: 'free', amount: 0 }),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(f.created().line_items, [{ price: 'price_game', quantity: 1 }]);
});
test('unpaid, unrelated, live and refunded purchases cannot fulfill', async (t) => {
  const f = await fixture(t);
  const request = () => f.request(`/api/order?session_id=${id}`);
  f.session.payment_status = 'unpaid';
  assert.equal((await request()).status, 409);
  f.session.payment_status = 'paid';
  f.session.line_items.data[0].price.id = 'price_other';
  assert.equal((await request()).status, 409);
  f.session.line_items.data[0].price.id = 'price_game';
  f.session.livemode = true;
  assert.equal((await request()).status, 409);
  f.session.livemode = false;
  f.payment.latest_charge.amount_refunded = 100;
  assert.equal((await request()).status, 409);
  assert.equal((await f.request('/api/order?session_id=../../secret')).status, 400);
});
test('concurrent fulfillment is durable and signed download rechecks refund status', async (t) => {
  const f = await fixture(t);
  const results = await Promise.all(
    Array.from({ length: 5 }, () => f.request(`/api/order?session_id=${id}`).then((r) => r.json())),
  );
  assert.equal(new Set(results.map((r) => r.download)).size, 1);
  assert.deepEqual(await fs.readdir(f.config.orders), [`${id}.json`]);
  const download = results[0].download;
  assert.equal((await f.request(download)).status, 200);
  assert.equal((await f.request(download.replace(/token=.*/, 'token=bad'))).status, 403);
  f.payment.latest_charge.refunded = true;
  assert.equal((await f.request(download)).status, 409);
});
test('webhooks require real signatures, support duplicates, and fulfill without redirect', async (t) => {
  const f = await fixture(t);
  const payload = JSON.stringify({
    id: 'evt_example',
    type: 'checkout.session.completed',
    livemode: false,
    data: { object: f.session },
  });
  const send = (signature) =>
    f.request('/api/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signature },
      body: payload,
    });
  assert.equal((await send('invalid')).status, 400);
  const signature = f.client.webhooks.generateTestHeaderString({
    payload,
    secret: f.config.webhook,
  });
  assert.equal((await send(signature)).status, 200);
  assert.equal((await send(signature)).status, 200);
  assert.deepEqual(await fs.readdir(f.config.orders), [`${id}.json`]);
});
test('server serves demo but never repository, order records, or release files', async (t) => {
  const f = await fixture(t);
  const html = await (await f.request('/demo/')).text();
  assert.match(html, /data-edition="demo"/);
  for (const url of [
    '/commerce/server.js',
    '/.env',
    '/.git/config',
    '/release/last-train-ledger.zip',
    '/.store-data/order.json',
  ])
    assert.equal((await f.request(url)).status, 404);
});
