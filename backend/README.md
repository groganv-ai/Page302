# Page302 Scores — local prototype

## Review with real Pack 002 answers

Run `node backend/review-server.cjs`, then open `http://127.0.0.1:8080` and select Scores. This uses the separate ignored `backend/review.sqlite` database. Pack 003 remains the current game; Pack 002 has ten generated complete submissions made from actual pack players through the existing game scoring functions. Initials and extra guess counts are synthetic. The generated squads and scores are reproducible; references are assigned on first seeding. Re-running does not duplicate entries. Pack 003 has an intentionally extended review-only window through 2099, not a release schedule. Shared result URLs use `?resultPack=002&resultRef=xxxxxx`; they work locally and will require the deployed service configuration for public use.

This service saves browser-supplied scores and guesses unchanged. It does **not** recalculate scores or prove that submitted answers are eligible footballers. It checks shape, a complete formation, duplicate person identities, and the pack window. Production game-data validation and automated-submission protection are not yet implemented.

Requires Node 24 (built-in SQLite). Run from the repository root:

```
node --test tests/scores-backend.test.cjs
node backend/admin.cjs add-pack backend/example-pack.json
node backend/server.cjs
node backend/admin.cjs finalize 003
```

The local service listens on 127.0.0.1:8787. Data defaults to `backend/local.sqlite` (ignored by Git). Set `PAGE302_DB` to select a separate file. Finalisation is a local administrator command, never a public endpoint. This prototype has no Cloudflare deployment, automatic scheduler, public result HTML, export or backup automation. SQLite schema and service behaviour are intended for the later Worker/D1 adapter; Node's SQLite API itself does not run in Workers.

The active result screen now connects locally when served from localhost or 127.0.0.1. Serve the website on port 8080 (the default allowed browser origins); start the service separately on 8787. For other environments set `window.PAGE302_SCORES_API` before `scores-client.js` loads and explicitly configure the service's allowed origins. The deployed GitHub page deliberately shows “service not connected” until a production address is configured. Browser integration tests use an isolated in-memory database. Browser identities reuse the game's existing normalised full-name matching, prefixed with player/manager role; same-name different people will require curated identity overrides before competition use. The current game data does not provide globally stable person IDs.

## Submission contract

POST `/api/submissions`, JSON body:

```
{
  "requestId": "a-stable-random-id-for-this-attempt",
  "packId": "003",
  "initials": "VGG",
  "score": 2450,
  "guesses": 18,
  "answers": [
    {
      "personId": "stable-person-identity-across-clubs",
      "name": "Player name",
      "position": "GK",
      "clubs": ["ARS"],
      "contributions": [{"recordId": "pack-specific-record", "points": 100}]
    }
  ]
}
```

Provide all 12 answers, including one MAN. Keep answer order stable on retries. `requestId` must be 16–80 letters/digits/hyphens/underscores and reused only for retrying the same submission. Stable person identities must be shared across club records, not club-specific IDs; the client adapter must establish that mapping before integration. Supplied contribution points are stored, not reconciled with the final total.

Successful response: pack, uppercase initials, six-digit reference, saved score/guesses, receipt timestamp. References include leading zeroes and are unique per pack. They are public labels, not passwords. Changed payloads with an existing request ID fail with 409. An already accepted retry succeeds even after closing; a new submission does not.

GET `/api/results/latest` returns the latest published pack and results ranked 1–25 (including cutoff ties). GET `/api/results/003?initials=VGG` searches all published results in that pack; add `reference=482193` to narrow. Older published packs remain retrievable for permanent links. Before publication, requests reveal no squads. Pagination and dedicated permanent HTML routes are integration work.

## Scheduling and calculations

Store explicit ISO opening/closing instants with offsets or UTC; the service normalises to UTC. Opening is inclusive and closing exclusive. Configuration should use Europe/London: weekly Monday 01:00 to next Monday 00:00, or daily 01:00 to next midnight. The one-hour gap is outside the submission window. Offset selection for GMT/BST is currently explicit in pack configuration; automatic UK schedule generation is future work.

Finalisation atomically saves an immutable snapshot. Rank = score descending, guesses ascending; ties share ranks with gaps. Each person counts once per submission, with MAN identities separate from player identities. Answer percentage = count / all accepted submissions × 100. Overall rarity is the mean of 12 unrounded percentages. Formatting/rounding belongs in the UI. An empty pack publishes an empty table. Publication is idempotent and latest-pack selection follows closing time, not publication execution order.

## Before any public deployment

- Add the Worker/D1 adapter, protected administration and scheduled publication with failure reporting.
- Supply authoritative pack/person identities and validate answers without recalculating points.
- Add abuse controls, request throttling, result pagination, exports and backup/restore checks.
- Test independently against actual pack data and approved screens; keep preview and production databases separate.
- Browser-provided score and guesses remain deliberately unverified under the agreed initial-release scope.
