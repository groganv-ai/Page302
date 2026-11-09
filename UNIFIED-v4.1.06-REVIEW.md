# Unified v4.1.06_003

Current follow-up build: **v4.1.07_002**. Pack 002 is available on 9 November;
the existing 003–007 calendar remains 10–14 November. New Game and Play Again
reload only the currently valid pack. The one-minute midnight gap is preserved.
The preview at port 8090 now uses the actual local calendar and persistent scores
in `.local/daily-review.sqlite`, replacing the earlier static pack-003 rehearsal.
No remote calendar or database has been changed.

Branch: `codex/v4.1.06_003-unified`, started from approved `origin/main`.
Local merge commits bring in the latest `origin/v4.1.2_003` and
`codex/v4.1.04_003-eligible-answers`. Existing branches and worktrees are preserved.

## Included functionality

- v4 branding, mobile layout, selected club/position input, exact row placement,
  coloured feedback, vidiprinter reveal, native/text sharing and social preview fix.
- Saved-progress recovery, submission receipt recovery, challenge deadlines,
  current standing, final leaderboards, search, reports and privacy changes.
- Positive-appearance eligibility throughout lookup, linked-club scoring, replay
  and recovery. Caretakers and zero-appearance records cannot earn points;
  historical records and old backend receipts remain preserved.
- Approved alternate names as valid answers, including Kepa, Son, Ederson,
  Tugay, Gabriel, Dele, Zanka, Kun, Emre, Stelios, Thiago, Tuncay, Korean family
  names and Haaland for Alf-Inge Haaland. Existing choices resolve ambiguity.
- Updated JSON/CSV packs 001–007. Pack 007 is the recreated version selected in
  the scheduler chat: 325 positive-appearance records, player IDs and updated
  aliases. Packs 001–006 retain their historical data and eligibility rules.
- Daily scheduler, every-minute Worker Cron, immutable final results, late-tick
  recovery, pause/resume, close/extend, future replacement and calendar controls.
- v4 UI, input reset, progress tracking and deadline refresh remain connected
  when the scheduler changes pack. The displayed build suffix follows the pack.

The uncommitted input-design study is superseded by the implemented selection
flow; its temporary mock submission and layout toggles are not release features.

## Agreed calendar

All times are Europe/London (GMT on these dates). Opening occurs on the next
minute scheduler tick; submissions close at the exclusive midnight boundary.

| Pack | Opens | Closes | Formation |
| --- | --- | --- | --- |
| 003 | Tue 10 Nov 2026 00:01 | Wed 11 Nov 00:00 | 5-4-1 |
| 004 | Wed 11 Nov 2026 00:01 | Thu 12 Nov 00:00 | 4-5-1 |
| 005 | Thu 12 Nov 2026 00:01 | Fri 13 Nov 00:00 | 4-4-2 |
| 006 | Fri 13 Nov 2026 00:01 | Sat 14 Nov 00:00 | 4-3-3 |
| 007 | Sat 14 Nov 2026 00:01 | Sun 15 Nov 00:00 | 5-4-1 |

Calendar: `tools/release-calendar.2026-11-10.json`. Reviewed SQL is generated with:

```powershell
node tools/release-scheduler.cjs plan tools/release-calendar.2026-11-10.json --out outputs/unified-review/calendar.sql
```

The static manifest remains 001–003; it never selects future packs immediately.
When enabled, the backend calendar controls selection and the midnight gap.

## Validation

- 40 combined browser/backend/eligibility/scheduler regressions passed.
- Additional actual-calendar rehearsal passed all five approved days: no early
  pack access, inclusive opening, midnight cutoff, five final publications,
  unchanged receipts and idempotent repeat ticks.
- 5,199 eligible valid-answer/position checks across all seven packs, explicitly
  including Kepa and Haaland. Ineligible records' aliases were also rejected.
- 3,784 surname typo checks, exact precedence, ambiguity and scoring passed.
- All seven combined and 77 individual CSV exports match JSON answer fields.
- Actual local Wrangler 4.147.0 Worker/D1/Cron runtime passed: close/publish 003,
  open 004, reject future payloads, preserve results and retry safely.
- Pages packaging and whitespace checks passed. Browser build labels match
  v4.1.06 with the correct pack suffix on desktop and mobile.

## Review and activation

Run `node tools/v4-review.cjs` with `PORT=8090` for an isolated pack-003 gameplay
preview. It uses in-memory scores and disables calendar selection so the game
can be reviewed before the first daily opening. Scheduler tests separately
rehearse the actual agreed calendar.

No remote Worker/D1/calendar change or Pages deployment has been made. The
configured backend is `page302-scores-preview`; its use as the live beta target
still needs confirmation. Before activation, inspect and back up that target,
apply the scheduler migration, deploy the reviewed Worker, and reconcile the
existing pack-003 window/submissions. Adopt an existing pack rather than reset
or replace saved submissions; the generated staging SQL rejects such conflicts.
Then stage/enable the approved calendar and verify the opening and final results.

Present this consolidated version for review before pushing/merging. GitHub Pages
deployment retains its separate environment approval. No old branches are deleted.
