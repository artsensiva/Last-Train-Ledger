# Contributing

Use a focused branch from current `main`, such as `feat/route-events` or `fix/save-validation`. Keep changes small enough to review. Push the branch and open a pull request; do not force-push or bypass checks on `main`.

## Setup

Use Node 24 (`nvm use` when available), then run `npm ci --ignore-scripts`. Python 3 is used only by the optional local preview command `npm start`; the game has no runtime packages.

## Before a commit

Run `npm run format`, `npm run check`, `npm test`, and `npm run build`. Changes to mechanics should include focused rule tests and a complete playthrough where practical. Changes to the interface should be checked on desktop and narrow screens. Never claim a check passed if it was not run.

Commit source, tests, documentation, and package-lock.json. Do not commit node_modules, dist, archives, credentials, personal saves, or temporary screenshots. Use descriptive commits, for example `fix: preserve deadlines when restoring a journey`.

Keep engine transitions deterministic, preserve input immutability, and validate saved data before rendering it. Keep game content separate from DOM handling. Rendering must escape content from saves and player input. Do not add runtime AI calls, tracking, or server dependencies without an explicit product decision.

## Review and merge

Describe the behavior change, validation, and relevant limitations in the pull request. Resolve failed CI checks before merging. Prefer a squash merge for a single coherent change and remove the feature branch after merging. Repository rules should require both Node matrix checks before changes enter main; configuring those rules is an owner-level repository decision.

## Release

Build from a reviewed commit. Package dist/ as the playable distribution and preserve a source tag for reproducibility. Public deployment, store submission, release pricing, and license selection require a separate explicit decision; this setup does not publish a website or choose an open-source license.
