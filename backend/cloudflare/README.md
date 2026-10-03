# Cloudflare preview scores service

The Worker exposes the same submission and result endpoints as the local service. It saves supplied scores and guesses unchanged. Validation is shared with `../validation.cjs`. D1 batches submission and answer writes atomically; unique constraints handle request and reference collisions. The adapter's finalisation method freezes writes before generating a publication and is retryable. No administration or scheduled endpoint is exposed by the Worker yet.

`wrangler.jsonc` targets the separate **preview-only** D1 database `page302-scores-preview` (Western Europe), created on 2026-10-03. Its account and database identifiers are public configuration, not credentials. Do not replace this binding with a production database. `migrations/0001_scores.sql` matches the local schema.

Wrangler is pinned to 4.147.0 in `package.json` and `pnpm-lock.yaml`. Run `pnpm install --frozen-lockfile`, then `pnpm run test:runtime` for the local integration checks and `pnpm run check` for a deployment dry run. The integration check uses only local D1 state under ignored `.wrangler/runtime-check`, resets that disposable test state, and never writes to remote D1. Its fixture includes ten genuine pack 002 answer sets plus a temporary pack 003 submission window; neither is release data.

Next setup, after review:

1. Completed: pin Wrangler and authenticate with the intended Cloudflare account.
2. Completed: create a separate preview D1 database and bind its returned ID in the config.
3. Completed: apply migrations locally and exercise the adapter in Wrangler's actual runtime.
4. Completed: GitHub Pages origin https://groganv-ai.github.io is allowed and hosted HTML configures the Cloudflare API address.
5. Completed: apply migrations and review fixtures to the preview database and deploy the preview Worker.

Do not use the local review-only 2099 window for release packs. Both emulated adapter tests and real local Worker/D1 runtime checks have passed. The remote preview service was deployed on 2026-10-03 at `https://page302-scores-preview.vince-grogan-games.workers.dev` (version `b9434252-835b-493e-bfc3-32591a416045`). The remote schema and ten generated genuine pack 002 squads are loaded. Pack 003 uses its real 5-4-1 formation and an open-ended preview window with no scheduled close; this is not the competition schedule. A genuine pack 003 smoke submission (`TST`, reference `899732`) is stored with its supplied score 7460 and guess count 14. Retrying created no duplicate: one submission and twelve answer rows were verified directly in remote D1.

Remote API checks passed for latest results, initials search, reference lookup, submission, unchanged score and guesses, stable retry, changed-content rejection, closed-pack rejection, active answer hiding and origin rejection. No paid-plan change or website deployment occurred. The GitHub upload configures the hosted website API; upload it to update the live site. Local review keeps its previous API fallback. CORS permits the configured local website origins and https://groganv-ai.github.io and is not authentication or bot protection.

Remaining before public competition: controlled UK schedules, protected pack administration and publication, abuse protection, exports/backups, authoritative person IDs and load testing. The current JSON publication reads the whole closed pack into memory; it is suitable for the small preview but must be assessed for larger volumes. Scores and guesses intentionally remain browser-supplied.

Official references: https://developers.cloudflare.com/d1/worker-api/d1-database/ and https://developers.cloudflare.com/workers/wrangler/configuration/

Open-ended packs use an empty closes_at value in the existing NOT NULL schema. addPack accepts closesAt:null; both stores allow submissions without a scheduled closing time and refuse to publish until an explicit closing time is set. Remote pack 003 is configured this way. Pack 001 is absent and pack 002 is closed; neither accepts new submissions.
