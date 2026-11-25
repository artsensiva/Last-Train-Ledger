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

## Storefront and Stripe test integration

The `feat/stripe-storefront` work adds a separate Node server; the downloadable game still has no runtime dependencies. The storefront is **test-only**, not a live store. It refuses live Stripe keys and events. No public deployment is included.

Run `npm ci --ignore-scripts`, then `npm run package` (requires Python 3), then `npm run store`. Open http://127.0.0.1:4180. Without credentials, the storefront and three-station Meridian demo work; checkout stays disabled. Demo saves are separate from full-game saves. The demo ends on reaching station three, before its arrival incident; ongoing contracts are not scored as failures. The demo is a presentation limit, not DRM; the repository remains public.

For Stripe testing, copy `.env.example` to an ignored local `.env`, fill it with a **test** secret key, an active one-time EUR test Price ID, the webhook signing secret, and a randomly generated download signing secret of at least 32 characters. Launch with `node --env-file=.env commerce/server.js`. Never send secrets through chat or commit them. Configure your Stripe CLI listener to forward `checkout.session.completed` and `checkout.session.async_payment_succeeded` to `/api/webhook`; its signing secret differs from a Dashboard endpoint secret.

The server creates a hosted Checkout Session using only the server-configured price. Signed webhooks and the return page both perform idempotent fulfillment. Each fulfillment retrieves the session and payment from Stripe, checks the product price, quantity, payment and test status, and stores an atomic entitlement record. Downloads require a signed link and recheck refund/dispute status. Amounts on the page come from Stripe, not a hardcoded advertised price. No real transactions or Stripe-account changes have been performed.

Only allowlisted storefront/demo assets are served. The full ZIP and order directory are private. Retain the download-signing secret and back up the order directory; changing the secret invalidates existing links, but the original success URL can issue a new link. That URL is a bearer credential: do not log query strings, include them in analytics, or share them. No customer email is stored locally; this release has bookmark-based recovery only.

### Before production

- Choose hosting and domain. This server binds to loopback and expects an HTTPS reverse proxy for staging. A deployment must provide durable private storage, backups, error monitoring, and edge rate limiting. The built-in limiter is per-process and uses the direct peer address, not forwarded headers.
- Configure Stripe test credentials and verify an actual hosted test checkout, webhook retry, refund, and downloaded archive in browsers. Automated tests use a mocked Stripe API and real SDK signature verification; they do not establish account integration.
- Add transactional delivery email and secure recovery for customers who close checkout. Configure sender identity and support email. Test provider outages/retries before enabling sales.
- Finalize seller identity, VAT treatment, privacy and digital-content sale terms. The current storefront explicitly identifies itself as a preview and does not invent these details.
- Decide how the public source repository fits the paid offer. This integration protects the packaged download, not publicly available source or assets already delivered to browsers.
- Complete independent playtests and agree on launch price. Add real gameplay screenshots/video and privacy-conscious conversion measurement before paid acquisition.
- Implement a separately reviewed live-mode configuration after these requirements are met. Do not simply substitute a live key: this release intentionally rejects it.

Stripe references: [Checkout fulfillment](https://docs.stripe.com/checkout/fulfillment), [webhook verification](https://docs.stripe.com/webhooks), [Checkout Session creation](https://docs.stripe.com/api/checkout/sessions/create).
