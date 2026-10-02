# Cloudflare preview adapter — not deployed

The Worker exposes the same submission and result endpoints as the local service. It saves supplied scores and guesses unchanged. Validation is shared with `../validation.cjs`. D1 batches submission and answer writes atomically; unique constraints handle request and reference collisions. The adapter's finalisation method freezes writes before generating a publication and is retryable. No administration or scheduled endpoint is exposed by the Worker yet.

`wrangler.jsonc` is a **preview-only template**. Its database ID is intentionally a placeholder. Do not replace it with a production database. `migrations/0001_scores.sql` matches the local schema. There are no account credentials in these files.

Next setup, after review:

1. Install/pin Wrangler in this folder, authenticate with the intended Cloudflare account.
2. Create a separate preview D1 database; put its returned ID in the config.
3. Apply migrations locally and exercise the adapter in Wrangler's actual runtime.
4. Configure the exact preview website origin and browser `PAGE302_SCORES_API` address.
5. Apply migrations and fixtures to the preview database, then deploy only the preview Worker.

Do not use the local review-only 2099 window for release packs. Tests currently emulate the D1 prepared-statement/batch API using Node SQLite; real Wrangler/Cloudflare runtime verification remains required. No deployment, paid plan, database creation or remote writes have occurred.

Remaining before public competition: controlled UK schedules, protected pack administration and publication, abuse protection, exports/backups, authoritative person IDs and load testing. The current JSON publication reads the whole closed pack into memory; it is suitable for the small preview but must be assessed for larger volumes. Scores and guesses intentionally remain browser-supplied.

Official references: https://developers.cloudflare.com/d1/worker-api/d1-database/ and https://developers.cloudflare.com/workers/wrangler/configuration/
