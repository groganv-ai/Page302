# Page302 release scheduler

Integrated on branch `codex/v4.1.06_003-unified`, website build
`v4.1.06_003`. No remote migration, schedule, deployment or pack window has been
changed by building/testing this tool. The example dates are placeholders.
The agreed calendar is `tools/release-calendar.2026-11-10.json`: packs 003–007
on 10–14 November 2026, using the recreated pack 007 and updated valid answers.
When scheduling is enabled, the displayed build suffix follows the active game
pack (for example `v4.1.06_004`) without changing the application patch.

## Daily operation

The calendar uses Europe/London. Each dated pack opens at 00:01 UK time and closes
at the following midnight. The closing instant is exclusive; submissions received
at or after it are rejected even if Cron is late. Opening waits for the scheduler,
which checks every minute. Open pages check for changes every 30 seconds. These
polling intervals are not a guarantee of exact-second activation.

00:01 exists once on every UK date, including both clock-change days. This keeps
a one-minute gap after midnight throughout GMT and BST. `opensAt` and `closesAt`
with explicit ISO UTC offsets can override either default.

The scheduler freezes and publishes final scores/rarity for closed packs, then
opens the next approved pack. A failed publication blocks the next pack and is
retried on subsequent runs. Existing snapshots and receipt retries remain stable.
Missed runs publish expired packs without reopening them. Up to 20 outstanding
closed packs are processed per tick; later ticks continue catching up.

Final results stay available; nothing clears historical submissions. The existing
top-25-with-ties rules still apply. The leaderboard page fetches the latest final
publication when opened. Daily release does not require a new GitHub Pages deploy:
the website reads the approved calendar and pack content from D1.

## Prepare a calendar

Copy `tools/release-calendar.example.json` and replace its example dates and pack
paths. Paths are relative to the calendar file. Use approved generator exports.
The scheduler checks pack metadata, formations, duplicate answer/club IDs, answer
positions and nonnegative integer appearances. It does not independently audit
football facts or caretaker eligibility; use the generator's checks first.

```powershell
node tools/release-scheduler.cjs plan tools/my-release-calendar.json --out outputs/release-scheduler/reviewed-calendar.sql
```

Review UTC opening/closing instants, source paths and content hashes printed by
the command. The generated SQL stages frozen JSON in D1, so future source edits
do not silently alter approved content. Future packs cannot be downloaded through
the public pack API until opened. Keep future exports out of the static website
manifest/assets if their contents must remain unpublished.

## Local rehearsal

```powershell
node tools/release-scheduler.cjs stage tools/my-release-calendar.json --db outputs/release-scheduler/rehearsal.sqlite --apply
node tools/release-scheduler.cjs enable --db outputs/release-scheduler/rehearsal.sqlite --apply
node tools/release-scheduler.cjs tick --db outputs/release-scheduler/rehearsal.sqlite --apply
node tools/release-scheduler.cjs status --db outputs/release-scheduler/rehearsal.sqlite
```

The database path is always explicit. Local `--apply` operations create backups
under `outputs/release-scheduler/backups/` before calendar/override writes. Tick
publishes immutable snapshots; it does not create a whole-database backup each
minute. Local commands do not install a background service. For local HTTP tests,
use the existing backend server with `PAGE302_DB` set to the rehearsal database;
set `window.PAGE302_RELEASES_ENABLED=true` before loading the website scripts.

## Manual controls

The same commands either apply to an explicit local database (`--db ... --apply`)
or generate reviewed SQL (`--out change.sql`) for the Cloudflare administrator.

| Command | Effect |
| --- | --- |
| `pause` | Stop future openings. Current play and scheduled closing/publication continue. |
| `resume` | Allow the next eligible pack to open on the next tick. |
| `close 004` | Close a live pack now; the next tick freezes its final leaderboard. |
| `extend 004 2030-01-02T06:00:00Z` | Extend an unclosed pack, rejecting collisions with other windows. |
| `reschedule 005 2030-01-03T01:00:00Z 2030-01-04T00:00:00Z` | Move an unopened pack with no submissions. |
| `replace 005 outputs/game-pack-005/export/vggfax005.json` | Replace content/formation without changing its window, only if no submissions exist. |
| `cancel 005` | Remove a future pack with no submissions. |
| `adopt 003 data/vggfax003.json 2030-01-01T00:00:00Z` | Register an existing live/open-ended pack with an explicit closing time. |

To stop competition now, pause future openings and close the live pack. To extend
into another pack's slot, first pause, move/cancel the affected future packs, then
extend and resume after reviewing the new calendar. Operations reject overlaps;
they never silently move another pack. Published or finalising packs cannot be
extended, replaced or cancelled. Replacing a pack with saved submissions requires
a new pack ID so existing results remain meaningful. Replacing an active pack
without submissions prompts existing players to start a new game on the next poll.

The existing open-ended preview pack 003 must be explicitly adopted/closed before
staging overlapping daily windows. Nothing changes its deadline automatically.
Adoption preserves its original opening time, revision and saved submissions.

## Cloudflare rollout and administration

Use the pinned Wrangler from `backend/cloudflare` and the existing account-owned
authentication. There is no public administration endpoint or token embedded in
the website. Database writes require the administrator's Cloudflare permissions.
Choose/verify the target environment and D1 database before any remote operation:
the current configuration targets the existing **scores preview** service.

Release order, with the repository's explicit review/deployment approvals:

1. Review changes and choose the intended Cloudflare target. Export/back up its D1
   data and confirm the current live pack/window before changing it.
2. Apply migration `0002_release_scheduler.sql` using the project's normal D1
   migration command. It defaults the scheduler to disabled.
3. Deploy the reviewed Worker, including Cron and observability. Verify
   `/api/releases` returns `{"enabled":false}`. Deploy the website through the
   approved PR/merge-commit/Pages environment review process.
4. Adopt the existing outgoing pack, stage the reviewed calendar and inspect D1
   rows. Apply generated SQL with the existing authenticated Wrangler D1 command:
   `wrangler d1 execute DB --remote --file <reviewed.sql>` from the Cloudflare folder.
   Use the same explicit environment on every command when targeting an environment.
   Keep other administrator writers idle. Preserve the SQL files as change records.
5. Generate/apply `enable` SQL only when the website, Worker, calendar and closing
   time are approved. Verify `/api/releases`, the first Cron event and final scores.

The website enables schedule lookup by default on public hosts; localhost retains
the existing pack-playtest behaviour unless explicitly enabled. An enabled
website fails closed when schedule lookup fails, rather than selecting a future
pack from a fallback manifest. Deploy the migration/Worker before the website.

To apply an override remotely, generate its SQL, review it, back up D1, then run the
authenticated D1 file command. SQL guards fail on stale/conflicting states. Do not
retry a failed multi-operation file blindly: inspect database state first. Local
apply wraps all changes in one transaction. Remote file import behaviour must be
checked against the selected Wrangler/D1 target; a long import may span batches.

Inspect `release_control`, joined `packs`/`release_schedule`, `release_events` and
`publications` for status. A `failed` close is retried; the Worker also reports a
failed scheduled invocation in Cloudflare logs. Configure failure/stale-scheduler
alerts in the deployment's monitoring system if proactive notifications are wanted;
this tool does not install external notifications. Code rollback does not undo
calendar/database changes: pause first and use the saved database export/change
records when restoring.

Cloudflare references: [Cron triggers and local testing](https://developers.cloudflare.com/workers/configuration/cron-triggers/),
[D1 administration commands](https://developers.cloudflare.com/d1/wrangler-commands/).

## Verification

```powershell
node --test tests/release-scheduler.test.cjs
node --test tests/release-scheduler-browser.test.cjs
# From backend/cloudflare:
node runtime-check.cjs
```

The browser check exercises pack 004, the midnight gap, its frozen leaderboard,
pack 005 opening and desktop/mobile layout. The runtime check uses isolated local
Wrangler state and invokes the actual Cloudflare scheduled handler. No remote
database is used by either test.
