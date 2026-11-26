(() => {
  'use strict';
  const DEMO = document.documentElement.dataset.edition === 'demo';
  const E = window.Ledger,
    KEY = DEMO ? 'last-train-ledger-demo-v1' : 'last-train-ledger-v1',
    BEST = DEMO ? 'last-train-ledger-demo-best-v1' : 'last-train-ledger-best-v1.1';
  let state = null,
    selected = 'meridian',
    saved = null,
    saveAvailable = true,
    toastTimer;
  const el = document.getElementById('app'),
    help = document.getElementById('help');
  const esc = (v) =>
    String(v).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const money = (n) => `${n < 0 ? '−' : ''}£${Math.abs(n)}`;
  function notify(text) {
    const x = document.getElementById('toast');
    x.textContent = text;
    x.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (x.style.display = 'none'), 4200);
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (E.valid(parsed)) saved = parsed;
      else notify('The saved journey could not be restored. You can start a fresh service.');
    }
  } catch {
    saveAvailable = false;
    notify('Browser storage is unavailable. This journey will remain in memory only.');
  }
  function persist() {
    saved = state;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      if (state.phase === 'ended') {
        const score = E.summary(state).score;
        const best = Number(localStorage.getItem(BEST)) || 0;
        if (score > best) localStorage.setItem(BEST, String(score));
      }
    } catch {
      if (saveAvailable)
        notify('Saving is unavailable. Keep this tab open to retain your journey.');
      saveAvailable = false;
    }
  }
  function header() {
    return `<header class="topbar"><div class="brand"><span class="brand-mark" aria-hidden="true">▥</span> LAST TRAIN LEDGER</div><span class="edition">THE NIGHT SERVICE · EST. 1893</span><nav class="top-actions" aria-label="Game controls"><button data-action="help" class="quiet">How to play</button>${state ? '<button data-action="menu" class="quiet">Main menu</button>' : ''}</nav></header>`;
  }
  function art() {
    return `<svg class="hero-art" viewBox="0 0 660 420" role="img" aria-label="A brass-lit steam train crossing a bridge beneath the moon"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#20353e"/><stop offset="1" stop-color="#101b20"/></linearGradient><linearGradient id="body" x2="0" y2="1"><stop stop-color="#557270"/><stop offset="1" stop-color="#223c40"/></linearGradient><radialGradient id="lamp"><stop stop-color="#ffe0a1" stop-opacity=".5"/><stop offset="1" stop-color="#e8b76a" stop-opacity="0"/></radialGradient></defs><rect width="660" height="420" rx="160" fill="url(#sky)"/><circle cx="495" cy="78" r="39" fill="#d9d9bd"/><circle cx="480" cy="65" r="38" fill="#20353e"/><g fill="#c6d2c3" opacity=".7"><circle cx="120" cy="62" r="1.5"/><circle cx="310" cy="53" r="1.5"/><circle cx="388" cy="104" r="1"/><circle cx="556" cy="136" r="1.5"/><circle cx="215" cy="110" r="1"/><circle cx="575" cy="54" r="1"/></g><path d="M0 243L90 157 181 235 271 149 363 235 468 177 660 250V420H0" fill="#233940"/><path d="M0 282L96 223 173 271 283 210 364 284 510 226 660 285V420H0" fill="#182b32"/><g fill="#9ab1ac" opacity=".14"><ellipse cx="375" cy="157" rx="53" ry="15"/><ellipse cx="325" cy="137" rx="60" ry="18"/><ellipse cx="269" cy="117" rx="58" ry="21"/><ellipse cx="206" cy="97" rx="66" ry="22"/></g><path d="M25 318H635V330H25z" fill="#aa8b60"/><path d="M30 334H630M40 343H620" stroke="#526361" stroke-width="4"/><g stroke="#465d60" stroke-width="8"><path d="M78 345V415M225 345V415M375 345V415M525 345V415"/><path d="M78 348L225 406 375 348 525 406 615 350"/></g><g stroke="#c99f65" stroke-width="2"><rect x="60" y="248" width="125" height="53" rx="5" fill="#304b50"/><rect x="198" y="248" width="122" height="53" rx="5" fill="#304b50"/><path d="M56 246H188M194 246H323" stroke-width="6"/><rect x="331" y="246" width="71" height="55" fill="#29454a"/><rect x="342" y="218" width="59" height="29" fill="#304b50"/><path d="M335 215H407" stroke-width="7"/><rect x="402" y="246" width="116" height="55" rx="18" fill="url(#body)"/><path d="M451 246V215H473V246" fill="#28434a"/><path d="M446 214H479" stroke-width="5"/><path d="M490 248V236H502V249" fill="#bb9360"/><path d="M515 289L548 310H508" fill="#243b42"/></g><g fill="#e8b76a"><rect x="72" y="260" width="22" height="20" rx="2"/><rect x="106" y="260" width="22" height="20" rx="2"/><rect x="140" y="260" width="22" height="20" rx="2"/><rect x="211" y="260" width="22" height="20" rx="2"/><rect x="245" y="260" width="22" height="20" rx="2"/><rect x="279" y="260" width="22" height="20" rx="2"/><rect x="351" y="225" width="16" height="17"/><rect x="375" y="225" width="16" height="17"/></g><g fill="#13262e" stroke="#af956e" stroke-width="4"><circle cx="83" cy="304" r="12"/><circle cx="163" cy="304" r="12"/><circle cx="219" cy="304" r="12"/><circle cx="299" cy="304" r="12"/><circle cx="354" cy="299" r="18"/><circle cx="406" cy="299" r="18"/><circle cx="459" cy="299" r="18"/></g><path d="M351 299H463" stroke="#d4b581" stroke-width="5"/><circle cx="520" cy="267" r="60" fill="url(#lamp)"/><circle cx="520" cy="267" r="6" fill="#ffe3a3"/><path d="M540 251L653 222V310L540 284" fill="#e8b76a" opacity=".045"/><text x="330" y="385" fill="#8b9c9c" text-anchor="middle" font-family="monospace" font-size="11" letter-spacing="4">COPPERGATE — DAWN TERMINAL</text></svg>`;
  }
  function landing() {
    state = null;
    el.innerHTML =
      header() +
      `<main class="landing">${DEMO ? '<p class="onboarding">FREE DEMO · Meridian · First three stations. <a href="/">Back to the storefront</a></p>' : ''}<section class="hero"><div><p class="eyebrow">A STRATEGY GAME OF SMALL PROMISES</p><h1>The last train.<br><em>Your ledger.</em></h1><p class="hero-copy">Eight stations before the light. A carriage full of stories. Decide who gets aboard, what you can promise, and how much the night will cost.</p></div>${art()}</section><div class="intro-rule"></div><div class="fleet-title"><h2>Choose your locomotive</h2><span class="eyebrow">ONE NIGHT · MANY WAYS HOME</span></div><div class="fleet">${(DEMO ? E.TRAINS.slice(0, 1) : E.TRAINS).map((t) => `<button class="train-choice ${t.id === selected ? 'selected' : ''}" data-action="select" data-id="${t.id}" aria-pressed="${t.id === selected}"><p class="eyebrow">${t.tag}</p><h3>${t.name}</h3><p class="desc">${t.desc}</p><div class="train-stats"><span>${t.capacity} spaces</span><span>${t.tank} coal capacity</span><span>£${t.cash} cash</span></div></button>`).join('')}</div><div class="launch"><label>Journey seed<input id="seed" maxlength="40" value="${esc(new Date().toISOString().slice(0, 10))}" autocomplete="off" spellcheck="false"></label><button class="primary" data-action="start">Begin the night</button>${saved ? `<button data-action="continue">${saved.phase === 'ended' ? 'View last ledger' : 'Continue saved journey'}</button>` : ''}<span class="footnote">Single player · 15–25 minutes · Saves locally</span></div></main>`;
  }
  function stat(label, value, suffix = '', warn = false) {
    return `<div class="stat"><label>${label}</label><strong class="${warn ? 'warning' : ''}">${value}</strong> <small>${suffix}</small></div>`;
  }
  function ticket(c) {
    const full = E.used(state) + c.space > E.train(state).capacity;
    return `<article class="ticket"><div class="ticket-top"><span class="ticket-type">${esc(c.icon)} ${esc(c.type)}</span><span class="fare">£${c.pay}</span></div><h3>${esc(c.title)}</h3><p class="story">${esc(c.story)}</p><div class="ticket-meta"><span class="chip">${E.STATIONS[c.dest].name}</span><span class="chip ${c.urgent ? 'urgent' : ''}">By ${E.clock(c.deadline)}</span></div><div class="ticket-footer"><span>${c.space} ${c.space === 1 ? 'space' : 'spaces'} · payment on arrival</span><button data-action="accept" data-id="${esc(c.id)}" ${full ? 'disabled' : ''}>${full ? 'No room' : 'Take aboard'}</button></div></article>`;
  }
  function history() {
    return `<details><summary>Read the conductor’s log (${state.history.length})</summary><div class="history">${state.history
      .slice()
      .reverse()
      .map((h) => `<p><time>${E.clock(h.time)}</time>${esc(h.text)}</p>`)
      .join('')}</div></details>`;
  }
  function eventPanel() {
    if (state.phase !== 'event') return '';
    const e = E.EVENTS.find((e) => e.id === state.event);
    return `<section class="event" aria-label="Incident"><p class="eyebrow">A MOMENT ON THE LINE</p><h2>${e.title}</h2><p>${e.text}</p><div class="event-choices">${e.choices.map((c, i) => `<button data-action="choice" data-index="${i}" ${state.cash + (c.cash || 0) < 0 || state.fuel + (c.fuel || 0) < 0 ? 'disabled' : ''}><strong>${c.label}</strong><span>${c.note}</span></button>`).join('')}</div></section>`;
  }
  function game() {
    if (DEMO && state.station >= 2) {
      el.innerHTML =
        header() +
        `<main class="ending"><p class="eyebrow">THREE STATIONS · DEMO COMPLETE</p><h1>Your night has just begun.</h1><p class="muted">You reached ${E.STATIONS[2].name} at ${E.clock(state.time)}, with ${state.delivered.length} deliveries and ${money(state.cash)} in cash. Contracts still aboard continue beyond this demo; this is not your final score.</p><p>The full journey continues to Dawn Terminal, with eight stations and three locomotives.</p><div class="end-actions"><a class="download-link" href="/">Explore the full game</a><button data-action="replay">Replay this demo</button></div></main>`;
      return;
    }
    if (state.phase === 'ended') {
      ending();
      return;
    }
    const s = state,
      t = E.train(s),
      station = E.STATIONS[s.station],
      u = E.used(s),
      locked = s.phase === 'event';
    el.innerHTML =
      header() +
      `<main class="shell"><section class="stats" aria-label="Train status">${stat('Cash', money(s.cash), '', s.cash < 12)}${stat('Coal', s.fuel, `/ ${t.tank}`, s.fuel < 5)}${stat('Condition', s.condition, `/ ${t.condition}`, s.condition < 20)}${stat('Aboard', u, `/ ${t.capacity}`)}${stat('Reputation', s.rep)}${stat('Until 03:00', Math.max(0, 360 - s.time), 'min', s.time > 300)}</section><nav class="route-map" aria-label="Journey progress">${E.STATIONS.map((x, i) => `<div class="stop ${i === s.station ? 'current' : i < s.station ? 'done' : ''}" ${i === s.station ? 'aria-current="step"' : ''}><span class="dot"></span>${x.name}</div>`).join('')}</nav><div class="workspace"><section><header class="station-head"><div><p class="eyebrow">STOP ${s.station + 1} OF 8 · ${station.kind}</p><h1>${station.name}</h1><p class="muted">${station.desc}</p></div><div class="station-clock">${E.clock(s.time)}</div></header>${s.station === 0 ? '<div class="onboarding"><strong>Your first departure.</strong> Take a few tickets, check their destinations and deadlines, then choose a track below. You are paid when you deliver. Leave room in both your timetable and your tender.</div>' : ''}${eventPanel()}${
        !locked
          ? `<div class="section-head"><h2>Waiting on the platform</h2><span>${s.offers.length} offers · accept only what you can carry</span></div><div class="offers">${s.offers.length ? s.offers.map(ticket).join('') : '<p class="empty">The platform is clear. Your next stop is waiting.</p>'}</div><div class="section-head"><h2>Depart for ${E.STATIONS[s.station + 1].name}</h2><span>Choose your track</span></div><div class="routes">${E.routes(
              s,
            )
              .map((r) => {
                const unavailable = s.fuel < r.fuel || s.condition <= r.wear || s.cash < r.fee;
                return `<button class="track" data-action="travel" data-id="${r.id}" ${unavailable ? 'disabled' : ''}><strong>${r.name}</strong><p>${r.desc}</p><span class="cost">${r.minutes} min · ${r.fuel} coal · ${r.wear} wear<br>£${r.fee} crew & handling<br>Arrive ${E.clock(s.time + r.minutes)}</span><span class="action">${unavailable ? 'Check cash, coal & condition' : 'Depart via ' + r.name.toLowerCase()}</span></button>`;
              })
              .join('')}</div>`
          : '<p class="empty">Resolve the incident above to open the station platform and workshop.</p>'
      }${history()}</section><aside class="sidebar"><section class="panel"><h2>The manifest <span class="muted">· ${u}/${t.capacity}</span></h2><div class="capacity" aria-hidden="true">${Array.from({ length: t.capacity }, (_, i) => `<i class="${i < u ? 'filled' : ''}"></i>`).join('')}</div>${s.manifest.length ? s.manifest.map((c) => `<article class="aboard"><h3>${esc(c.icon)} ${esc(c.title)}</h3><p>${E.STATIONS[c.dest].name} · ${c.space} ${c.space === 1 ? 'space' : 'spaces'}<br><span class="${s.time > c.deadline ? 'warning' : ''}">Due ${E.clock(c.deadline)}</span> · £${c.pay}${s.time > c.deadline ? ' (half fare now)' : ''}</p>${!locked ? `<button data-action="abandon" data-id="${esc(c.id)}">Hand to relief crew (−3 reputation)</button>` : ''}</article>`).join('') : '<p class="empty">An empty carriage.<br>A little room for possibility.</p>'}</section><section class="panel"><h2>Station workshop</h2><div class="services"><button data-action="fuel" ${locked || s.fuel >= t.tank || s.cash < Math.min(5, t.tank - s.fuel) * station.price ? 'disabled' : ''}><span>Add ${Math.min(5, t.tank - s.fuel)} coal</span><small>£${Math.min(5, t.tank - s.fuel) * station.price}</small></button><button data-action="repair" ${locked || s.condition >= t.condition || s.cash < 14 ? 'disabled' : ''}><span>Repair up to 20 condition</span><small>£14 · 7 min</small></button><button data-action="credit" ${locked || s.creditUsed ? 'disabled' : ''}><span>${s.creditUsed ? 'Advance already taken' : 'Emergency advance'}</span><small>+£35</small></button></div><p class="empty" style="font-size:.75rem;padding-bottom:0">Coal: £${station.price} per unit. Advance repayment: £45 at journey’s end.</p></section><section class="panel"><h2>Tonight’s record</h2><p class="empty">${s.delivered.length} delivered · ${s.delivered.filter((c) => c.outcome === 'On time').length} on time<br>${money(s.earned)} received · ${money(s.spent)} spent</p><p class="eyebrow">${t.name}</p></section>${!locked ? '<button class="quiet danger" data-action="retire">End this service</button>' : ''}</aside></div><footer class="bottom-note"><span>Journey ${esc(s.seed)} · ${saveAvailable ? 'Autosaved on this device' : 'In-memory session · storage unavailable'}</span><span>Every ticket is a promise.</span></footer></main>`;
  }
  function ending() {
    const s = state,
      r = E.summary(s);
    let best = r.score;
    try {
      best = Math.max(r.score, Number(localStorage.getItem(BEST)) || 0);
    } catch {}
    el.innerHTML =
      header() +
      `<main class="ending"><p class="eyebrow">${s.reason === 'arrived' ? 'DAWN TERMINAL · SERVICE COMPLETE' : 'THE NIGHT SERVICE · FINAL REPORT'}</p><h1>${r.title}</h1><p class="muted">${s.reason === 'arrived' ? `You arrived at ${E.clock(s.time)}. The passengers go their separate ways.<br>For a few hours, their stories were yours to carry.` : s.reason === 'dawn' ? 'The timetable ran out. The relief crew will take the remaining passengers onward.' : s.reason === 'breakdown' ? 'The engine needs a workshop. The relief crew takes over from here.' : 'You chose to hand the service to the relief crew. Some nights call for another try.'}</p><div class="end-stats"><div><strong>${r.score}</strong><span>Service score</span></div><div><strong>${r.onTime}</strong><span>Promises kept on time</span></div><div><strong>${money(r.net)}</strong><span>Net result after advance repayment</span></div><div><strong>${s.rep}</strong><span>Reputation earned</span></div></div><p class="muted">${r.late} late arrivals · ${s.missed.length} handed to relief · Best score: ${best}<br>Score rewards net earnings, on-time deliveries, reputation, and reaching the terminus.</p><div class="end-actions"><button class="primary" data-action="replay">Replay this journey</button><button data-action="menu">Choose another engine</button><button data-action="export">Save journey card</button></div><section class="results"><div class="section-head"><h2>The promises you carried</h2><span>${E.train(s).name} · ${esc(s.seed)}</span></div>${[...s.delivered, ...s.missed].map((c) => `<div class="result-row"><div>${esc(c.title)}<small>${E.STATIONS[c.dest].name}</small></div><span>${esc(c.outcome)}${c.income !== undefined ? ' · £' + c.income : ''}</span></div>`).join('') || '<p class="empty">No contracts accepted on this service.</p>'}${history()}</section></main>`;
  }
  function exportCard() {
    const r = E.summary(state),
      c = document.createElement('canvas');
    c.width = 1200;
    c.height = 720;
    const x = c.getContext('2d');
    x.fillStyle = '#101b20';
    x.fillRect(0, 0, 1200, 720);
    x.strokeStyle = '#e8b76a';
    x.lineWidth = 2;
    x.strokeRect(35, 35, 1130, 650);
    x.fillStyle = '#e8b76a';
    x.font = '18px sans-serif';
    x.fillText('LAST TRAIN LEDGER / THE NIGHT SERVICE', 75, 95);
    x.fillStyle = '#f0eee5';
    x.font = '54px Georgia';
    x.fillText(r.title, 75, 185);
    x.font = '24px sans-serif';
    x.fillStyle = '#abb9b9';
    x.fillText(`${E.train(state).name} · Journey ${state.seed}`, 75, 238);
    x.strokeStyle = '#42575d';
    x.beginPath();
    x.moveTo(85, 345);
    x.lineTo(1115, 345);
    x.stroke();
    E.STATIONS.forEach((st, i) => {
      const px = 85 + i * 135;
      x.fillStyle = i <= state.station ? '#e8b76a' : '#42575d';
      x.beginPath();
      x.arc(px, 345, 8, 0, Math.PI * 2);
      x.fill();
      x.save();
      x.translate(px, 375);
      x.rotate(0.38);
      x.font = '15px sans-serif';
      x.fillText(st.name, 0, 0);
      x.restore();
    });
    x.fillStyle = '#f0eee5';
    x.font = '42px Georgia';
    x.fillText(`${r.score} points`, 75, 515);
    x.fillText(`${r.onTime} on time`, 455, 515);
    x.fillText(money(r.net) + ' net', 850, 515);
    x.fillStyle = '#abb9b9';
    x.font = '20px sans-serif';
    x.fillText(
      `${state.delivered.length} delivered · ${r.late} late · ${state.missed.length} handed to relief`,
      75,
      565,
    );
    x.fillStyle = '#e8b76a';
    x.font = 'italic 24px Georgia';
    x.fillText('Every ticket is a promise.', 75, 645);
    const data = c.toDataURL('image/png');
    document.getElementById('journey-image').src = data;
    document.getElementById('download-card').href = data;
    document.getElementById('card-preview').showModal();
  }
  el.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-action]');
    if (!b || b.disabled) return;
    const a = b.dataset.action;
    if (a === 'help') {
      help.showModal();
      return;
    }
    if (a === 'select') {
      const seed = document.getElementById('seed').value;
      selected = b.dataset.id;
      landing();
      document.getElementById('seed').value = seed;
      return;
    }
    if (a === 'start') {
      if (
        saved &&
        saved.phase !== 'ended' &&
        !confirm('Begin a new service? This replaces your saved journey.')
      )
        return;
      state = E.create(document.getElementById('seed').value.trim() || 'NIGHT-001', selected);
      persist();
      game();
      window.scrollTo(0, 0);
      return;
    }
    if (a === 'continue') {
      state = JSON.parse(JSON.stringify(saved));
      game();
      window.scrollTo(0, 0);
      return;
    }
    if (a === 'menu') {
      landing();
      window.scrollTo(0, 0);
      return;
    }
    if (a === 'replay') {
      state = E.create(state.seed, state.train);
      persist();
      game();
      window.scrollTo(0, 0);
      return;
    }
    if (a === 'export') {
      exportCard();
      return;
    }
    if (!state || (DEMO && state.station >= 2)) return;
    if (
      a === 'retire' &&
      !confirm('End this service? Contracts still aboard will be handed to relief.')
    )
      return;
    if (
      a === 'abandon' &&
      !confirm('Hand this contract to the relief crew? You receive no fare and lose 3 reputation.')
    )
      return;
    const result = E.act(state, { type: a, id: b.dataset.id, index: Number(b.dataset.index) });
    if (!result.ok) {
      notify(result.message);
      return;
    }
    const prior = state;
    state = result.state;
    persist();
    game();
    if (a === 'travel' || a === 'choice') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      const target = el.querySelector(a === 'travel' ? '.event h2' : '.station-head h1');
      if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
      }
    } else if (a === 'accept') {
      notify('Added to the manifest.');
    } else if (a === 'fuel' || a === 'repair' || a === 'credit') notify(state.history.at(-1).text);
    if (a === 'travel') {
      const delivered = state.delivered.length - prior.delivered.length;
      if (delivered)
        notify(
          `${delivered} ${delivered === 1 ? 'delivery' : 'deliveries'} completed. Fares added to the ledger.`,
        );
    }
  });
  help.addEventListener('click', (e) => {
    if (e.target === help) {
      const r = help.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
        help.close();
    }
  });
  landing();
})();
