# Project instructions

This repository is the canonical source for Last Train Ledger. Preserve existing user changes.

- Use focused feature/fix branches and reviewable commits. Do not merge or force-push without explicit authorization.
- Keep the browser game offline-capable and free of runtime dependencies.
- Keep simulation rules in engine.js and UI behavior in app.js. Content changes must preserve deterministic seeds and consistent accounting.
- Run npm run check, npm test, and npm run build before handing off changes. For UI changes, verify the affected browser flow when tooling is available.
- Keep package-lock.json committed. Do not commit dist, node_modules, archives, secrets, or personal saves.
- Update README.md and QA.md when behavior or verified capabilities change. State any verification limitations accurately.
