# Last Train Ledger

A complete small, offline-capable browser strategy game about running a night train and keeping promises. Local release candidate, version 1.0. No installation, account, paid service, external assets, or runtime AI API is required.

## Play

After running `npm run build`, open `dist/index.html` in a modern desktop browser. Keep all four distribution files together. For the most predictable save and download behavior, serve the project locally:

```sh
npm start
```

Then open http://127.0.0.1:4173 . This command requires Python 3. Alternatively, run `python3 -m http.server 4173 --bind 127.0.0.1` from this folder. The game itself needs neither Python nor Node when opened directly.

## What is included

- A complete eight-station journey, with three track choices on each of seven legs.
- Three locomotives: Meridian (balanced), Kestrel (fast), Atlas (large capacity).
- Twelve passenger archetypes and ten cargo archetypes, with seeded destinations, fares, urgency, and deadlines. Five offers per nonterminal platform; no duplicate role within a platform or among current passengers.
- Eighteen two-choice incidents; no repeated incident within a run.
- Capacity management, fuel, condition, repairs, crew costs, and a one-time emergency advance.
- On-time and late deliveries, contract handover, voluntary retirement, and terminal failure states.
- Complete accounting, reputation, service score, ending titles, history, same-seed replay, and a best score.
- Autosave and continue, validated save loading, responsive layout, keyboard controls, in-game guide, and an exportable 1200×720 journey card with a visible preview.
- Original SVG train illustration and system fonts; no third-party art or runtime dependencies.

## Rules

Start at 21:00. Dawn Terminal closes at 03:00: six hours of simulated time. Arrival exactly at the cutoff is allowed. Each departure uses the displayed fuel and condition and costs £10 plus £2 per occupied space. Hill sections cost more time and fuel. There is no passive ticking clock; thinking takes no game time.

Accepting a contract does not pay immediately. Delivery at or before its deadline pays the full fare and earns 2 reputation. A late delivery pays half (rounded down), without an on-time reputation award. Handing a contract to a relief crew pays nothing and loses 3 reputation. An unfinished contract at service termination loses 2 reputation.

Coal is sold in batches up to 5, capped at the engine's tank capacity. Each station's price is shown. A £14 repair restores up to 20 condition and takes 7 minutes. The £35 advance is available once, costs 3 reputation, and results in a £45 deduction in the final net result. This repayment is not deducted a second time from cash.

Net result = final cash − initial cash − advance repayment, if any.
Score = max(0, net result + 18 × on-time deliveries + 5 × reputation + 80 if terminus reached − 12 × missed contracts).

The event shown after a leg occurs after unloading at the arrival station; its delays affect remaining contracts and the next departure. Predicted track arrival times exclude the next station incident. Each seed and action sequence reproduces exactly; different choices can change later offers because onboard roles are excluded.

## Develop and verify

Node.js 22+ is required for development; Node.js 24 is recommended for the built-in test runner. The game has no runtime dependencies. Prettier is a pinned development-only dependency; install it with `npm ci --ignore-scripts`.

```sh
npm ci --ignore-scripts
npm run check
npm test
npm run build
```

`build.js` creates the four-file static distribution in `dist/`. Ship that directory to players, or package it as a ZIP after building. Do not serve or deploy the project publicly without reviewing the intended release.

## Source map

- `engine.js`: pure cloned-state transitions, seeded random generator, train/station/event/contract definitions, save validation, accounting, summaries.
- `app.js`: DOM rendering, original train artwork, accessibility interactions, local storage, canvas souvenir rendering.
- `style.css`: responsive visual system and reduced-motion behavior.
- `index.html`: entry point and accessible guide/export dialogs.
- `tests/engine.test.js`: deterministic tests, failure cases, corrupted saves, and a 600-run simulation.
- `build.js`: dependency-free packaging.

To add an incident, extend `EVENTS` with a unique id, title, description, and two choices. Choice effects may change cash, fuel, condition, reputation (`rep`), or minutes (`time`). Always include an option usable without cash or fuel, then run the tests. To change the save schema, bump `VERSION` and define a migration or a clear fallback. Keep customer-facing strings escaped if they originate from saves or input.

## Save behavior

One run is stored per browser origin. Starting a new run asks before replacing an unfinished one. Best score is stored separately. File-opening and local-server origins may maintain different saves. Private browsing and browser policy can block persistence; the UI reports this and keeps the active run in memory. Export previews work without a server, but automatic download support depends on the host browser; right-click/long-press the image is a fallback.

## Current limits and release work

This is a complete local game, not a publicly launched or commercially validated product. It has English text, one route corridor, and no music or sound effects. Track choices change route costs rather than branching into separate towns. The content pool is deliberately compact, so roles can recur after earlier contracts have been delivered.

Automated verification checks correctness, not entertainment value. External players should assess decision clarity, pacing, replay interest, and willingness to pay before committing to a store release. Remaining distribution work includes store packaging, screenshots/trailer, release pricing tests, platform submissions, and any desired localization or audio. No public deployment or spending was performed.

A plausible commercial experiment is a free three-station demo leading to the full eight-station game with all engines. This is a hypothesis, not evidence of demand; the delivered local version is complete and has no paywall.

## Repository workflow

Canonical checkout: `/home/artem/Last-Train-Ledger`. Remote: https://github.com/artsensiva/Last-Train-Ledger. Earlier chat output bundles are snapshots, not the ongoing source of truth.

Use feature branches and pull requests. CI checks syntax, formatting, tests, and builds on Node 22 and 24. GitHub Actions are pinned to commit SHAs, workflow permissions are read-only, and Dependabot proposes tool/action updates. See CONTRIBUTING.md for the development and release workflow. Build output is intentionally ignored by Git.
