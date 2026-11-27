# Score validation — v4.1.27 review

Prepared on `codex/server-score-validation` from approved `origin/main`
`45c326ee1391d7b5a93048b30601586d50e921ca`. The user approved sandbox testing
on 27 November 2026; live deployment remains unapproved.

## Sandbox rollout

Deployed only `page302-scores-testing`, version
`e732242d-bdf4-49c7-aa2a-1e0704ffbb94`, bound to testing database
`a1b78e57-c747-4f7e-8751-a41220916092`. The live website and scores service
were not deployed or rebound.

The existing GitHub sandbox website (v4.1.26_015) successfully saved a genuine
pack 015 squad for 2,825 points under initials SVT, reference 617256. A repeat
returned the same receipt. Altered points and an invented identity both returned
HTTP 422. All observed API requests used the testing service; the browser test
blocked any request to the live site or scores service. One sandbox score was
created; no live scores were submitted. The v4.1.27 website must pass the normal
separate GitHub Pages environment approval before publishing.

## Behaviour

The Cloudflare scores service previously accepted a structurally valid squad and
its claimed total without checking the football records. New submissions now
require the frozen pack from `release_schedule`, matching the pack's formation.
The server verifies identities, positions, participation eligibility, linked
clubs, rarity, club-use tiers and individual contributions, and computes the
total independently. A mismatch returns HTTP 422 and creates no score or answers.

The existing browser scoring rules and points tables are unchanged. Submitted
clubs identify the selected club before normalization sorts the list. Since
answers are sent in squad-slot order, club-use tiers are checked as a complete
sequence for each selected club, rather than treating slot order as pick order.
Caretakers and zero-appearance records cannot contribute to a score.

Already saved receipts remain retryable, including after closing. Historical
scores and publications are not recalculated. The insert also checks that the
approved payload and formation have not changed since validation.

The website displays a specific rejection message and preserves the player's
result for reporting/retry. APP_BUILD increments to v4.1.27_002; the scheduled
pack continues to determine the displayed suffix.

## Validation

- 84 browser-engine squads across seven packs, both points tables and forward/
  reverse pick order match the independent server calculation.
- Tests cover multi-club players/managers, caretaker/zero-match exclusions,
  fabricated identities and points, invalid tiers and positions, missing approved
  data, retry compatibility, and a pack replacement during submission.
- The actual local Worker/D1 runtime rejects a forged score and accepts genuine
  scores; publication, scheduled opening, retries and body checks pass.
- Headless Edge checks real D1-adapter submissions, rejection messaging, lost-
  receipt retry, saved-result reopening, mobile fit and displayed version.
- Backend, eligibility, scheduler and ranking regressions pass. Worker dry run,
  website packaging and `git diff --check` pass.

## Limits and release considerations

This validates a possible legitimate squad and its points, not proof of human
play. Guess count remains client-reported. Rate limiting and preventing separate
attempts with new request IDs are separate work.

Enforcement is in the production Cloudflare D1 adapter used by both scores
Workers. The older local ScoreStore remains a fixture/review implementation;
the new validation tests exercise D1Store and the actual Worker runtime.

No database migration is needed. Every pack accepting new submissions must have
approved frozen content; missing content fails closed even if scheduling is off.
Before release, review the intended live and testing targets and confirm their
active pack payloads exist. Use the normal review, merge and deployment approvals.
Deploy the reviewed backend and matching website; test on the isolated testing
service before changing the live service. No production test scores are needed.
