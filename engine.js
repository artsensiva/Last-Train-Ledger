(function (root) {
  'use strict';
  const VERSION = 1;
  const TRAINS = [
    {
      id: 'meridian',
      name: 'The Meridian',
      tag: 'A steady hand',
      desc: 'Balanced capacity and fuel economy. The recommended first locomotive.',
      capacity: 8,
      tank: 24,
      fuel: 20,
      cash: 62,
      condition: 100,
      wear: 1,
      factor: 1,
    },
    {
      id: 'swift',
      name: 'The Kestrel',
      tag: 'Built for the timetable',
      desc: 'A fast, light engine. Less room, but every journey takes 8 fewer minutes.',
      capacity: 6,
      tank: 22,
      fuel: 18,
      cash: 70,
      condition: 90,
      wear: 1,
      factor: 0.9,
    },
    {
      id: 'freight',
      name: 'The Atlas',
      tag: 'Room for one more',
      desc: 'Twelve spaces and a strong chassis. Heavy loads come with a thirst for fuel.',
      capacity: 12,
      tank: 30,
      fuel: 24,
      cash: 54,
      condition: 110,
      wear: 0.8,
      factor: 1.25,
    },
  ];
  const STATIONS = [
    {
      name: 'Coppergate',
      kind: 'DEPARTURE',
      desc: 'Under the great iron roof, a city waits to leave.',
      price: 3,
    },
    {
      name: 'Briar Crossing',
      kind: 'MARKET TOWN',
      desc: 'Apple crates, wet cobbles, and the last light in the bakery.',
      price: 3,
    },
    {
      name: 'Glassmere',
      kind: 'LAKESIDE',
      desc: 'The platform lamps make a second railway in the water.',
      price: 4,
    },
    {
      name: 'Cinder Works',
      kind: 'INDUSTRIAL',
      desc: 'The foundry whistles outlast the shift. Coal is cheap here.',
      price: 2,
    },
    {
      name: 'High Fell',
      kind: 'MOUNTAIN PASS',
      desc: 'Above the cloud line, even the signal bells sound thin.',
      price: 4,
    },
    {
      name: 'Lantern Heath',
      kind: 'RURAL JUNCTION',
      desc: 'A single lit waiting room in a country of dark fields.',
      price: 3,
    },
    {
      name: 'Saltwick',
      kind: 'HARBOUR',
      desc: 'A tide of porters carries the sea into the station.',
      price: 3,
    },
    {
      name: 'Dawn Terminal',
      kind: 'END OF THE LINE',
      desc: 'The first ferries are sounding. Your night ends here.',
      price: 3,
    },
  ];
  const PEOPLE = [
    ['The night nurse', 'Mara has a ward to open before morning.', '✚'],
    ['The violinist', 'A borrowed instrument. One chance to audition.', '♫'],
    ['The returning father', 'He has memorized the address on a folded letter.', '⌂'],
    ['The apprentice', 'A first wage, a new pair of boots, a distant workshop.', '⚒'],
    ['The lighthouse keeper', 'The relief boat will not wait beyond sunrise.', '◈'],
    ['The botanist', 'Her pressed flowers travel more carefully than she does.', '❧'],
    ['The schoolteacher', 'She counts tomorrow’s lessons instead of the minutes.', '✎'],
    ['The baker', 'The starter in his bag is older than this railway.', '⌂'],
    ['The retired driver', 'She still leans into every bend before the engine does.', '◉'],
    ['The sisters', 'Two tickets, one suitcase, a conversation in whispers.', '♡'],
    ['The station cat', 'The porter has paid its fare. It knows exactly where to go.', '♧'],
    ['The astronomer', 'Tonight’s sky is the reason for the journey.', '✧'],
  ];
  const CARGO = [
    ['Winter medicine', 'Sealed tins for a village clinic.', '✚'],
    ['Printing plates', 'The morning edition depends on these heavy cases.', '▤'],
    ['Clockwork parts', 'Wrapped in felt, addressed in precise handwriting.', '⚙'],
    ['Orchard crates', 'Briar’s last harvest, bound for brighter shop windows.', '❧'],
    ['The wedding cake', 'Keep it level. The ribbon alone took an hour.', '◇'],
    ['Glass lanterns', 'A fragile shipment for the coastal watch.', '✧'],
    ['Letters from home', 'An entire town’s news in a canvas sack.', '✉'],
    ['Foundry tools', 'Heavy enough to make the loading ramp complain.', '⚒'],
    ['Market flowers', 'Their buyer pays more before the morning stalls open.', '❀'],
    ['Archive trunks', 'A century of records, entrusted to one night train.', '▣'],
  ];
  const EVENTS = [
    {
      id: 'signal',
      title: 'A dark signal',
      text: 'The semaphore ahead has gone dark. A signal worker offers to guide you through.',
      choices: [
        { label: 'Hire the guide', note: 'Pay £9; no delay', cash: -9 },
        { label: 'Wait for clearance', note: '+14 minutes', time: 14 },
      ],
    },
    {
      id: 'tea',
      title: 'The midnight kettle',
      text: 'A station volunteer is serving tea. Your passengers could use a quiet moment.',
      choices: [
        { label: 'Stop for everyone', note: '+8 minutes; +2 reputation', time: 8, rep: 2 },
        { label: 'Keep the timetable', note: 'No change' },
      ],
    },
    {
      id: 'bearing',
      title: 'A hot bearing',
      text: 'There is a sharp new note beneath the rhythm of the wheels.',
      choices: [
        {
          label: 'Replace the bearing',
          note: 'Pay £12; +12 condition; +5 minutes',
          cash: -12,
          condition: 12,
          time: 5,
        },
        { label: 'Nurse it onward', note: '−9 condition', condition: -9 },
      ],
    },
    {
      id: 'post',
      title: 'The station postbag',
      text: 'The porter flags you down with one small bag of unclaimed letters.',
      choices: [
        { label: 'Take the bag', note: 'Earn £7; +6 minutes loading', cash: 7, time: 6 },
        { label: 'Leave it for the morning', note: 'No change' },
      ],
    },
    {
      id: 'mist',
      title: 'Mist over the rails',
      text: 'The lamps become pale halos. Familiar landmarks disappear.',
      choices: [
        { label: 'Sound the whistle and slow', note: '+11 minutes', time: 11 },
        {
          label: 'Follow the rail markers',
          note: 'Use 2 fuel; −5 condition',
          fuel: -2,
          condition: -5,
        },
      ],
    },
    {
      id: 'coal',
      title: 'Coal beside the siding',
      text: 'A maintenance crew has clean surplus coal and nowhere to store it.',
      choices: [
        {
          label: 'Buy the surplus',
          note: 'Pay £6; +5 fuel; +4 minutes',
          cash: -6,
          fuel: 5,
          time: 4,
        },
        { label: 'Decline', note: 'No change' },
      ],
    },
    {
      id: 'doctor',
      title: 'A call for a doctor',
      text: 'Someone in the waiting room needs help. A passenger offers to assist.',
      choices: [
        { label: 'Allow time to help', note: '+12 minutes; +3 reputation', time: 12, rep: 3 },
        { label: 'Call the station attendant', note: '+3 minutes; +1 reputation', time: 3, rep: 1 },
      ],
    },
    {
      id: 'bridge',
      title: 'Inspection on the bridge',
      text: 'A railway inspector asks to examine your running gear.',
      choices: [
        {
          label: 'Cooperate with the inspection',
          note: '+9 minutes; +8 condition',
          time: 9,
          condition: 8,
        },
        { label: 'Use the bypass', note: 'Use 3 fuel; +3 minutes', fuel: -3, time: 3 },
      ],
    },
    {
      id: 'musician',
      title: 'A tune between stations',
      text: 'A traveller opens an instrument case. The carriage goes quiet.',
      choices: [
        { label: 'Offer a small tip', note: 'Pay £4; +2 reputation', cash: -4, rep: 2 },
        { label: 'Enjoy the music', note: 'No change' },
      ],
    },
    {
      id: 'rain',
      title: 'Rain through the roof',
      text: 'A loose sheet above the luggage rack begins to rattle.',
      choices: [
        { label: 'Secure the sheet', note: '+6 minutes; +5 condition', time: 6, condition: 5 },
        {
          label: 'Rearrange the luggage',
          note: '+2 minutes; −3 condition',
          time: 2,
          condition: -3,
        },
      ],
    },
    {
      id: 'water',
      title: 'The water tower',
      text: 'The tower crew offers to clean the boiler while the tender is filled.',
      choices: [
        {
          label: 'Take the service',
          note: 'Pay £8; +15 condition; +7 minutes',
          cash: -8,
          condition: 15,
          time: 7,
        },
        { label: 'Proceed without service', note: 'No change' },
      ],
    },
    {
      id: 'shortcut',
      title: 'A familiar face',
      text: 'An old driver knows a newly reopened service line.',
      choices: [
        { label: 'Buy the route advice', note: 'Pay £8; recover 10 minutes', cash: -8, time: -10 },
        { label: 'Stay on the known line', note: 'No change' },
      ],
    },
    {
      id: 'freight',
      title: 'An empty goods wagon',
      text: 'The yard needs one wagon shunted before you can depart.',
      choices: [
        {
          label: 'Help the yard crew',
          note: 'Earn £10; use 2 fuel; +7 minutes',
          cash: 10,
          fuel: -2,
          time: 7,
        },
        { label: 'Wait for their engine', note: '+5 minutes', time: 5 },
      ],
    },
    {
      id: 'ember',
      title: 'An ember on the platform',
      text: 'Your firebox scatters a spark into a stack of old timetables.',
      choices: [
        { label: 'Stop and put it out', note: '+4 minutes; +1 reputation', time: 4, rep: 1 },
        { label: 'Ask the porter to help', note: 'Pay £3', cash: -3 },
      ],
    },
    {
      id: 'sleep',
      title: 'A carriage of sleeping people',
      text: 'The train could make up time. But for once, everyone is resting.',
      choices: [
        { label: 'Keep a gentle pace', note: '+5 minutes; +2 reputation', time: 5, rep: 2 },
        { label: 'Make up time', note: 'Recover 5 minutes; −5 condition', time: -5, condition: -5 },
      ],
    },
    {
      id: 'parcel',
      title: 'An address in fading ink',
      text: 'A porter needs help identifying a parcel for an elderly resident.',
      choices: [
        {
          label: 'Help read the address',
          note: '+5 minutes; earn £5; +1 reputation',
          time: 5,
          cash: 5,
          rep: 1,
        },
        { label: 'Leave it with the office', note: 'No change' },
      ],
    },
    {
      id: 'axle',
      title: 'A careful mechanic',
      text: 'A young mechanic points out a loose pin you would have missed.',
      choices: [
        {
          label: 'Pay for the repair',
          note: 'Pay £7; +10 condition; +3 minutes',
          cash: -7,
          condition: 10,
          time: 3,
        },
        { label: 'Tighten it yourself', note: '+7 minutes; +5 condition', time: 7, condition: 5 },
      ],
    },
    {
      id: 'stars',
      title: 'A break in the cloud',
      text: 'The stars come out above the cutting. A child asks for the lights to dim.',
      choices: [
        { label: 'Let them see the sky', note: '+3 minutes; +2 reputation', time: 3, rep: 2 },
        { label: 'Keep rolling', note: 'No change' },
      ],
    },
  ];
  function hash(s) {
    let h = 2166136261;
    for (const c of String(s)) {
      h ^= c.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(s) {
    s.rng = (s.rng + 0x6d2b79f5) >>> 0;
    let t = s.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function pick(s, n) {
    return Math.floor(rng(s) * n);
  }
  function train(s) {
    return TRAINS.find((t) => t.id === s.train);
  }
  function used(s) {
    return s.manifest.reduce((n, c) => n + c.space, 0);
  }
  function log(s, text) {
    s.history.push({ time: s.time, station: s.station, text });
  }
  function offers(s) {
    const result = [];
    for (let i = 0; i < 5; i++) {
      let cargo = i > 2;
      const source = cargo ? CARGO : PEOPLE;
      const pool = source.filter((e) => ![...result, ...s.manifest].some((c) => c.title === e[0]));
      const entry = pool[pick(s, pool.length)];
      const distance = 1 + pick(s, Math.min(3, 7 - s.station));
      const dest = s.station + distance;
      const urgent = rng(s) < 0.35;
      const space = cargo ? 2 + pick(s, 2) : entry[0] === 'The sisters' ? 2 : 1;
      const pay = 12 + distance * 10 + space * 3 + (urgent ? 12 : 0) + pick(s, 7);
      result.push({
        id: `${s.station}-${i}`,
        title: entry[0],
        story: entry[1],
        icon: entry[2],
        type: cargo ? 'Cargo' : 'Passenger',
        space,
        dest,
        pay,
        deadline: s.time + distance * (urgent ? 38 : 49) + 12,
        urgent,
      });
    }
    return result;
  }
  function routes(s) {
    if (s.station >= 7) return [];
    const t = train(s),
      hill = s.station === 3 || s.station === 4;
    return [
      {
        id: 'main',
        name: 'Main line',
        desc: 'The reliable route. Moderate fuel and wear.',
        minutes: 38,
        fuel: 4,
        wear: 6,
      },
      {
        id: 'express',
        name: 'Express track',
        desc: 'Beat the clock. Harder on the engine.',
        minutes: 25,
        fuel: 7,
        wear: 12,
      },
      {
        id: 'scenic',
        name: 'Valley siding',
        desc: 'Save coal. Give the night a little more time.',
        minutes: 49,
        fuel: 3,
        wear: 4,
      },
    ].map((r) => ({
      ...r,
      minutes: r.minutes - (t.id === 'swift' ? 8 : 0) + (hill ? 5 : 0),
      fuel: Math.ceil((r.fuel + (hill ? 1 : 0)) * t.factor),
      fee: 10 + used(s) * 2,
      wear: Math.ceil(r.wear * t.wear),
    }));
  }
  function create(seed = 'NIGHT-001', id = 'meridian') {
    const t = TRAINS.find((t) => t.id === id) || TRAINS[0];
    const s = {
      version: VERSION,
      seed: String(seed).slice(0, 40),
      rng: hash(seed),
      train: t.id,
      station: 0,
      time: 0,
      cash: t.cash,
      fuel: t.fuel,
      condition: t.condition,
      rep: 0,
      earned: 0,
      spent: 0,
      manifest: [],
      delivered: [],
      missed: [],
      offers: [],
      history: [],
      eventsSeen: [],
      event: null,
      phase: 'station',
      creditUsed: false,
      reason: null,
    };
    s.offers = offers(s);
    log(s, 'The night service opens at Coppergate. Dawn Terminal closes at 03:00.');
    return s;
  }
  function error(message) {
    return { ok: false, message };
  }
  function finish(s, reason) {
    s.phase = 'ended';
    s.reason = reason;
    for (const c of s.manifest) s.missed.push({ ...c, outcome: 'Undelivered' });
    s.rep -= s.manifest.length * 2;
    s.manifest = [];
    log(
      s,
      reason === 'arrived'
        ? 'The last brakes settle. You have reached Dawn Terminal.'
        : reason === 'breakdown'
          ? 'The engine can go no further. A relief service is called.'
          : reason === 'dawn'
            ? 'The dawn deadline has passed. Control ends the service.'
            : 'You hand the service over to the relief crew.',
    );
  }
  function settle(s) {
    const arrived = s.manifest.filter((c) => c.dest === s.station);
    s.manifest = s.manifest.filter((c) => c.dest !== s.station);
    for (const c of arrived) {
      const late = s.time > c.deadline;
      const income = late ? Math.floor(c.pay * 0.5) : c.pay;
      s.cash += income;
      s.earned += income;
      s.rep += late ? 0 : 2;
      s.delivered.push({ ...c, outcome: late ? 'Late' : 'On time', income });
      log(
        s,
        `${c.title}: ${late ? 'late arrival, half fare' : 'promise kept'} at ${STATIONS[s.station].name}. Earned £${income}.`,
      );
    }
  }
  function check(s) {
    if (s.condition <= 0) finish(s, 'breakdown');
    else if (s.time > 360) finish(s, 'dawn');
  }
  function act(state, action) {
    const s = JSON.parse(JSON.stringify(state));
    if (s.phase === 'ended') return error('This service has ended. Start another journey.');
    const t = train(s);
    if (action.type === 'choice') {
      if (s.phase !== 'event') return error('There is no incident to resolve.');
      const ev = EVENTS.find((e) => e.id === s.event),
        c = ev?.choices[action.index];
      if (!c) return error('Choose one of the available responses.');
      if (s.cash + (c.cash || 0) < 0 || s.fuel + (c.fuel || 0) < 0)
        return error('You do not have the resources for this response.');
      for (const k of ['cash', 'fuel', 'condition', 'rep', 'time']) s[k] += c[k] || 0;
      s.time = Math.max(0, s.time);
      s.fuel = Math.min(t.tank, s.fuel);
      s.condition = Math.min(t.condition, s.condition);
      if (c.cash < 0) s.spent -= c.cash;
      if (c.cash > 0) s.earned += c.cash;
      log(s, `${ev.title}: ${c.label}. ${c.note}`);
      s.event = null;
      s.phase = 'station';
      check(s);
    } else if (s.phase !== 'station') return error('Resolve the incident first.');
    else if (action.type === 'accept') {
      const c = s.offers.find((c) => c.id === action.id);
      if (!c) return error('This offer is no longer available.');
      if (used(s) + c.space > t.capacity) return error('There is not enough space aboard.');
      s.manifest.push({ ...c });
      s.offers = s.offers.filter((x) => x.id !== c.id);
      log(s, `Accepted ${c.title} for ${STATIONS[c.dest].name} (£${c.pay}).`);
    } else if (action.type === 'fuel') {
      const qty = Math.min(5, t.tank - s.fuel),
        cost = qty * STATIONS[s.station].price;
      if (qty <= 0) return error('The tender is full.');
      if (s.cash < cost) return error('Not enough cash for coal.');
      s.cash -= cost;
      s.spent += cost;
      s.fuel += qty;
      log(s, `Bought ${qty} coal for £${cost}.`);
    } else if (action.type === 'repair') {
      const qty = Math.min(20, t.condition - s.condition);
      if (qty <= 0) return error('The locomotive is in perfect condition.');
      if (s.cash < 14) return error('Repairs cost £14.');
      s.cash -= 14;
      s.spent += 14;
      s.condition += qty;
      s.time += 7;
      log(s, `Workshop: +${qty} condition, £14, 7 minutes.`);
      check(s);
    } else if (action.type === 'credit') {
      if (s.creditUsed) return error('The emergency advance has already been used.');
      s.cash += 35;
      s.creditUsed = true;
      s.rep -= 3;
      log(s, 'Accepted a £35 emergency advance. £45 will be deducted from the final result.');
    } else if (action.type === 'abandon') {
      const c = s.manifest.find((c) => c.id === action.id);
      if (!c) return error('This contract is not aboard.');
      s.manifest = s.manifest.filter((x) => x.id !== c.id);
      s.missed.push({ ...c, outcome: 'Handed to relief' });
      s.rep -= 3;
      log(s, `Handed ${c.title} to the station relief service. −3 reputation.`);
    } else if (action.type === 'retire') {
      finish(s, 'retired');
    } else if (action.type === 'travel') {
      const r = routes(s).find((r) => r.id === action.id);
      if (!r) return error('Choose an available track.');
      if (s.cash < r.fee)
        return error(
          'Not enough cash for the crew. Request an advance or hand contracts to relief to reduce handling costs.',
        );
      if (s.fuel < r.fuel)
        return error('Not enough coal for this track. Refuel or request an advance.');
      if (s.condition <= r.wear)
        return error('The engine cannot safely cover this track. Repair it first.');
      s.cash -= r.fee;
      s.spent += r.fee;
      s.fuel -= r.fuel;
      s.condition -= r.wear;
      s.time += r.minutes;
      s.station++;
      log(
        s,
        `Took the ${r.name.toLowerCase()} to ${STATIONS[s.station].name}: ${r.minutes} minutes, ${r.fuel} coal, £${r.fee} crew and handling.`,
      );
      if (s.time > 360) {
        finish(s, 'dawn');
      } else {
        settle(s);
        if (s.station === 7) finish(s, 'arrived');
        else {
          s.offers = offers(s);
          const unseen = EVENTS.filter((e) => !s.eventsSeen.includes(e.id));
          const e = unseen[pick(s, unseen.length)];
          s.eventsSeen.push(e.id);
          s.event = e.id;
          s.phase = 'event';
        }
      }
    } else return error('Unknown action.');
    return { ok: true, state: s };
  }
  function summary(s) {
    const onTime = s.delivered.filter((c) => c.outcome === 'On time').length;
    const net = s.cash - train(s).cash - (s.creditUsed ? 45 : 0);
    const score = Math.max(
      0,
      Math.round(
        net + onTime * 18 + s.rep * 5 + (s.reason === 'arrived' ? 80 : 0) - s.missed.length * 12,
      ),
    );
    return {
      onTime,
      late: s.delivered.length - onTime,
      net,
      score,
      title:
        s.reason !== 'arrived'
          ? 'A night interrupted'
          : onTime >= 10 && s.rep >= 15
            ? 'Keeper of promises'
            : net >= 100
              ? 'Master of the ledger'
              : s.missed.length === 0 && onTime >= 5
                ? 'A dependable service'
                : 'Home before the light',
    };
  }
  function clock(min) {
    const total = (21 * 60 + Math.round(min)) % (24 * 60);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }
  function valid(s) {
    try {
      if (
        !s ||
        s.version !== VERSION ||
        !TRAINS.some((t) => t.id === s.train) ||
        !['station', 'event', 'ended'].includes(s.phase)
      )
        return false;
      const t = train(s);
      if (
        !Number.isInteger(s.station) ||
        s.station < 0 ||
        s.station > 7 ||
        typeof s.seed !== 'string' ||
        s.seed.length > 40 ||
        typeof s.creditUsed !== 'boolean'
      )
        return false;
      if (
        !['time', 'cash', 'fuel', 'condition', 'rep', 'earned', 'spent', 'rng'].every((k) =>
          Number.isFinite(s[k]),
        )
      )
        return false;
      if (
        !['manifest', 'offers', 'delivered', 'missed', 'history', 'eventsSeen'].every((k) =>
          Array.isArray(s[k]),
        )
      )
        return false;
      if (
        s.time < 0 ||
        s.cash < 0 ||
        s.fuel < 0 ||
        s.fuel > t.tank ||
        s.condition > t.condition ||
        used(s) > t.capacity
      )
        return false;
      const contract = (c) =>
        c &&
        typeof c.id === 'string' &&
        typeof c.title === 'string' &&
        typeof c.story === 'string' &&
        typeof c.icon === 'string' &&
        ['Passenger', 'Cargo'].includes(c.type) &&
        Number.isInteger(c.space) &&
        c.space > 0 &&
        c.space <= t.capacity &&
        Number.isInteger(c.dest) &&
        c.dest >= 1 &&
        c.dest <= 7 &&
        Number.isFinite(c.deadline) &&
        Number.isFinite(c.pay) &&
        c.pay >= 0;
      if (![...s.manifest, ...s.offers, ...s.delivered, ...s.missed].every(contract)) return false;
      if (
        !s.manifest.every((c) => c.dest > s.station) ||
        !s.history.every(
          (h) =>
            h &&
            Number.isFinite(h.time) &&
            Number.isInteger(h.station) &&
            typeof h.text === 'string',
        )
      )
        return false;
      if (s.phase === 'event' && !EVENTS.some((e) => e.id === s.event)) return false;
      if (s.phase === 'ended' && !['arrived', 'dawn', 'breakdown', 'retired'].includes(s.reason))
        return false;
      return true;
    } catch {
      return false;
    }
  }
  const api = {
    VERSION,
    TRAINS,
    STATIONS,
    EVENTS,
    create,
    act,
    routes,
    used,
    train,
    summary,
    clock,
    valid,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Ledger = api;
})(typeof window !== 'undefined' ? window : globalThis);
