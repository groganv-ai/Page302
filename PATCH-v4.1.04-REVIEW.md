# Reject zero-appearance answers — v4.1.04_003

## Verified baseline

On 9 November 2026, the live `https://groganv-ai.github.io/Page302/script.js` reported `v4.1.03_003` and matched `origin/v4.1.2_003` at `8dc36a8` byte for byte. SHA-256: `bb2a6104b6057d656ee4931ad6b2237403c3981454f588a0c24125f9713dae95`.

Approved `origin/main` remains at `f33dad1` (v3.7.13). The isolated branch `codex/v4.1.04_003-eligible-answers` starts there and includes the approved live release. Review the patch against `8dc36a8`, not the older main branch. Original worktrees and other preview/v5 branches are untouched.

## Patch

- A shared eligibility check requires a positive integer appearance/match count. Explicitly marked caretaker managers are also ineligible; the existing permanent-manager dataset selection is unchanged.
- Exact and fuzzy lookup, wrong-position hints, direct acceptance and linked-record discovery use that check. An exact ineligible surname does not fall through to a different fuzzy answer.
- Ineligible records cannot earn rarity points. Manager scoring excludes ineligible linked records before calculating the multiplier.
- Invalid attempts retain existing guess counting and invalid-answer feedback. They do not fill a slot, mark an identity used, increment club usage or award points. Missing selections and empty input retain their existing behaviour.
- Saved browser progress validates every replayed answer. If an old pick is ineligible, or its old score includes an ineligible linked-club bonus, recovery uses its existing all-or-nothing reset. No old points or pending submission are restored and no historical score is repriced.
- Source datasets are unchanged. No release manifest, calendar, schedule, production backend, submission payload, receipt or published-result code is changed. No historical database is opened or rewritten.
- The local-only review fixture generator now selects eligible candidates; it previously generated three zero-appearance answers in its sample squads. This affects new in-memory review fixtures, not live submissions or published results.

## Verification

All 29 regression tests pass, including nine new eligibility/history checks:

| Case | Result |
| --- | --- |
| Pack 003: select Arsenal + GK and enter HEIN | NOT FOUND; one guess; zero points, slots and club usage. The source zero-appearance record remains present. |
| Pack 007: SIDWELL at Brighton | Rejected, including fuzzy matching; no Brighton contribution. |
| Pack 007: SIDWELL at Fulham or Reading | Valid; only Fulham and Reading link. First-club score 520 (20 × 13 × 2), two 260-point contributions. |
| Zero-match manager / positive-match caretaker | Rejected and omitted from links and manager multipliers. |
| Ordinary eligible cases | Čech 260; Roy Keane multi-club 520; Mourinho 20. Positive rarity bands and duplicate handling unchanged. |
| Old browser save: Terry + Hein, score 1300 | Entire invalid local attempt cleared; zero restored points, slots or usage; existing recovery message shown. |
| Old browser save: Fulham Sidwell with Brighton bonus, score 780 | Discarded safely; not silently converted into a new 520-point submission. |
| Genuine v4.1.03 backend submission containing Hein | Original 1,580-point receipt, stored row and published leaderboard preserved byte for byte; idempotent retry unchanged after closing. |
| Existing regressions | Valid progress, exact Team rows, full-team completion/submission, retry receipts, leaderboards, reports, standings, SQLite/D1 parity and seven responsive widths pass. |

The Pack 007 release is not added to this baseline's calendar or data manifest. Its three original Sidwell records are pinned in a test-only fixture, with the source export hash recorded. A second fixture pins a genuine old-engine submission containing Hein for the historical-preservation check. Neither fixture is included in the public website build.

Additional checks: answer-selection browser suite, 3,784 fuzzy typo checks for eligible records, multi-club/multi-manager scoring, JavaScript syntax and the 70-file Pages build. Dataset and production backend/calendar diffs against the verified baseline are empty.

## Review

Isolated preview: `http://127.0.0.1:8089/` (process-memory scores only). Select Arsenal, select GK, enter HEIN. About shows `v4.1.04_003`. Original preview remains separate on port 8088.

No push, merge to main, backend rollout or deployment is authorized by this review. These require your approval.
