'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine');
function apply(s, a) {
  const r = E.act(s, a);
  assert.equal(r.ok, true, r.message);
  return r.state;
}
test('same seed and actions produce the same run; actions do not mutate inputs', () => {
  const a = E.create('fixed'),
    b = E.create('fixed');
  assert.deepEqual(a, b);
  const before = JSON.stringify(a);
  const c = apply(a, { type: 'accept', id: a.offers[0].id });
  assert.equal(JSON.stringify(a), before);
  assert.deepEqual(c, apply(b, { type: 'accept', id: b.offers[0].id }));
});
test('capacity limits and duplicate acceptance are enforced', () => {
  let s = E.create('spaces', 'swift');
  for (const c of [...s.offers]) {
    const r = E.act(s, { type: 'accept', id: c.id });
    if (r.ok) s = r.state;
  }
  assert.ok(E.used(s) <= 6);
  assert.equal(E.act(s, { type: 'accept', id: s.manifest[0].id }).ok, false);
});
test('delivery deadline pays full at equality, half when late', () => {
  for (const late of [false, true]) {
    let s = E.create('delivery');
    s.manifest = [
      {
        id: 'test',
        title: 'Test',
        story: 'Test',
        icon: 'x',
        type: 'Passenger',
        space: 1,
        dest: 1,
        pay: 40,
        deadline: late ? 37 : 38,
      },
    ];
    const cash = s.cash;
    s = apply(s, { type: 'travel', id: 'main' });
    assert.equal(s.cash, cash - 12 + (late ? 20 : 40));
    assert.equal(s.manifest.length, 0);
    assert.equal(s.delivered[0].outcome, late ? 'Late' : 'On time');
  }
});
test('workshop clamps fuel and condition, charges exact prices, cannot spend unavailable cash', () => {
  let s = E.create();
  s.fuel = 23;
  s = apply(s, { type: 'fuel' });
  assert.equal(s.fuel, 24);
  assert.equal(s.cash, 59);
  s.condition = 99;
  s = apply(s, { type: 'repair' });
  assert.equal(s.condition, 100);
  assert.equal(s.time, 7);
  s.cash = 0;
  assert.equal(E.act(s, { type: 'repair' }).ok, false);
  s.fuel = 0;
  assert.equal(E.act(s, { type: 'fuel' }).ok, false);
});
test('advance is one-time and repayment affects net result', () => {
  let s = E.create();
  s = apply(s, { type: 'credit' });
  assert.equal(E.act(s, { type: 'credit' }).ok, false);
  assert.equal(E.summary(s).net, -10);
});
test('event blocks station actions and invalid choice is rejected', () => {
  let s = apply(E.create(), { type: 'travel', id: 'main' });
  assert.equal(s.phase, 'event');
  assert.equal(E.act(s, { type: 'fuel' }).ok, false);
  assert.equal(E.act(s, { type: 'choice', index: 99 }).ok, false);
});
test('saved states roundtrip, malformed core states are rejected', () => {
  const s = E.create();
  assert.ok(E.valid(JSON.parse(JSON.stringify(s))));
  assert.ok(!E.valid({ ...s, version: 99 }));
  assert.ok(!E.valid({ ...s, station: 99 }));
  assert.ok(!E.valid({ ...s, fuel: -1 }));
  assert.ok(!E.valid({ ...s, train: 'missing' }));
  assert.ok(!E.valid({ ...s, phase: 'event', event: 'missing' }));
});
test('terminus settles contracts; timeout hands contracts to relief and ends run', () => {
  let s = E.create();
  s.station = 6;
  s.manifest = [
    {
      id: 'x',
      title: 'Last',
      story: 'Test',
      icon: 'x',
      type: 'Passenger',
      space: 1,
      dest: 7,
      pay: 25,
      deadline: 360,
    },
  ];
  s.time = 300;
  s = apply(s, { type: 'travel', id: 'main' });
  assert.equal(s.reason, 'arrived');
  assert.equal(s.delivered.length, 1);
  assert.equal(s.manifest.length, 0);
  s = E.create();
  s.time = 350;
  s.manifest = [
    {
      id: 'x',
      title: 'Late',
      story: 'Test',
      icon: 'x',
      type: 'Passenger',
      space: 1,
      dest: 2,
      pay: 25,
      deadline: 360,
    },
  ];
  s = apply(s, { type: 'travel', id: 'main' });
  assert.equal(s.reason, 'dawn');
  assert.equal(s.missed.length, 1);
  assert.equal(s.manifest.length, 0);
  assert.ok(E.valid(s));
});
test('retirement releases manifest and terminal state rejects actions', () => {
  let s = E.create();
  s = apply(s, { type: 'accept', id: s.offers[0].id });
  s = apply(s, { type: 'retire' });
  assert.equal(s.missed.length, 1);
  assert.equal(E.act(s, { type: 'fuel' }).ok, false);
});
test('every incident has an affordable safe response with zero cash and fuel', () => {
  for (const e of E.EVENTS) {
    let s = E.create();
    s.phase = 'event';
    s.event = e.id;
    s.cash = 0;
    s.fuel = 0;
    assert.ok(
      e.choices.some((c, i) => E.act(s, { type: 'choice', index: i }).ok),
      e.id,
    );
  }
});
test('600 seeded services finish without invalid numbers, capacity overflow, duplicate events or softlock', () => {
  const results = { arrived: 0, other: 0 };
  for (const t of E.TRAINS)
    for (let seed = 0; seed < 200; seed++) {
      let s = E.create('sim-' + seed, t.id),
        steps = 0;
      while (s.phase !== 'ended' && steps++ < 150) {
        if (s.phase === 'event') {
          const e = E.EVENTS.find((e) => e.id === s.event);
          const possible = e.choices
            .map((c, i) => ({ c, i }))
            .filter((x) => s.cash + (x.c.cash || 0) >= 0 && s.fuel + (x.c.fuel || 0) >= 0);
          possible.sort((a, b) => (a.c.time || 0) - (b.c.time || 0));
          s = apply(s, { type: 'choice', index: possible[0].i });
          continue;
        }
        for (const c of [...s.offers].sort(
          (a, b) => a.dest - b.dest || b.pay / b.space - a.pay / a.space,
        )) {
          const r = E.act(s, { type: 'accept', id: c.id });
          if (r.ok) s = r.state;
        }
        while (s.condition < 35 && s.cash >= 14 && s.phase === 'station')
          s = apply(s, { type: 'repair' });
        if (s.phase === 'ended') break;
        while (
          s.fuel < 9 &&
          s.cash >= Math.min(5, E.train(s).tank - s.fuel) * E.STATIONS[s.station].price
        )
          s = apply(s, { type: 'fuel' });
        let rs = E.routes(s).filter(
          (r) => r.fuel <= s.fuel && r.wear < s.condition && r.fee <= s.cash,
        );
        if (!rs.length) {
          if (!s.creditUsed) {
            s = apply(s, { type: 'credit' });
            continue;
          }
          s = apply(s, { type: 'retire' });
          break;
        }
        const urgent = s.manifest.some((c) => c.deadline - s.time < (c.dest - s.station) * 40);
        const r = rs.find((r) => r.id === (urgent ? 'express' : 'main')) || rs[0];
        s = apply(s, { type: 'travel', id: r.id });
        assert.ok(E.valid(s), `invalid at seed ${seed} / ${t.id}`);
        assert.ok(s.cash >= 0);
        assert.ok(s.condition >= 0);
        assert.ok(E.used(s) <= E.train(s).capacity);
      }
      assert.ok(steps < 150, 'softlock');
      assert.equal(new Set(s.eventsSeen).size, s.eventsSeen.length);
      results[s.reason === 'arrived' ? 'arrived' : 'other']++;
    }
  console.log('Simulation outcomes:', results);
  assert.ok(results.arrived > 450, 'reasonable strategy should usually reach terminus');
});

test('departure charges crew and refuses unaffordable departures', () => {
  let s = E.create('fees');
  const fee = E.routes(s)[0].fee;
  const cash = s.cash;
  s = apply(s, { type: 'travel', id: 'main' });
  assert.equal(s.cash, cash - fee);
  s = E.create();
  s.cash = 0;
  assert.equal(E.act(s, { type: 'travel', id: 'main' }).ok, false);
});
test('corrupt nested save data is rejected without throwing', () => {
  for (const patch of [
    { offers: [null] },
    { history: [null] },
    { manifest: [{ space: 0 }] },
    { offers: [{ id: 'x' }] },
    { history: [{}] },
    { seed: null },
  ])
    assert.equal(E.valid({ ...E.create(), ...patch }), false);
});
test('platform does not repeat a role already aboard or offered', () => {
  for (let i = 0; i < 100; i++) {
    const s = E.create('unique' + i);
    assert.equal(new Set(s.offers.map((c) => c.title)).size, s.offers.length);
  }
});
