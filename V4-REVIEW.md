# Page302 v4 review

Build: `v4.1.1_003`. Branch: `v4.1.1_003`. Base: approved `origin/main` at `f33dad1` (v3.7.13_003). Original checkout and its unfinished changes are preserved.

Header revision: date and cutoff use the reference's yellow mixed-case teletext style, followed by the countdown on one desktop line. Mobile shows only the countdown/status. Version is shown in About, not in the header or footer. P302 and VGGFAX stay adjacent on the left on every screen size. At Vincent’s request, the isolated review fixture closes at the next 00:00 GMT; its countdown and backend acceptance use that same stored deadline. Real scheduled challenges show their actual backend cutoff time in GMT/BST and a live countdown. No production schedule was changed.

## Implemented

- Approved masthead and stepped football artwork, compact branding, board-width green bars, centred subtitle, larger club text and usage labels. Club rows wrap when needed rather than clipping or truncating names.
- Plain football + Answer submit control retains mouse, touch and keyboard submission. Empty-input white block blinks; native editing resumes while typing; reduced motion uses a static block. Enter during IME composition does not submit.
- Dotted successful-answer panel shows actual surname, submitted club/season/use count, full rarity and the engine's actual awarded points. Linked clubs are listed separately without claiming that their usage incremented. Managers are labelled separately. Errors and disambiguation remain unchanged.
- Local progress recovery replays accepted picks against the exact current pack data and existing scoring rules. Restores score, guesses, club usage, identities and completion. Changed/malformed data and blocked storage fail safely. Submission retries reuse their original request ID; restored local receipts must be reconfirmed by the service before displaying SAVED.
- Read-only challenge endpoint reads stored backend opening/closing timestamps. Countdown uses backend time plus elapsed monotonic time, refreshes every minute and on tab resume, handles upcoming/closed/open-ended/unavailable schedules, and leaves existing practice and pack cycling intact.
- Read-only standing endpoint computes competition ranking by score, then fewer guesses; exact ties share rank. Repeated accepted attempts retain the existing publication treatment. Display bands are TOP 10%, 25%, 50%, 60%, 70%, 80%, 90%, then OUTSIDE TOP 90%. Band input is the percentage of accepted results strictly ahead of the saved result: `(rank - 1) / total * 100`. First place is TOP 10% even with one result. No rank, count, names or squads are returned by the standing endpoint. Display is centred, refreshes after confirmed submission, on reopening, every minute while visible and on tab resume. Published standing uses the frozen final snapshot.
- Production URLs in canonical/social metadata, pixel social card, SVG/PNG favicons, touch/app icons and web manifest. Privacy notice describes device-local progress. Pages packaging explicitly includes new assets and excludes backend/review tooling.

## Preserved behavior and decisions

- Pack data, formations, player matching, fuzzy matching, selectors, duplicate checks, scoring, linked-club contributions, navigation/help/about/reporting, results/deep links and submission receipt/retry flow are preserved.
- Manager scoring remains the approved engine's sum of linked rarity points multiplied by linked-manager count (`script.js`, `calculateMultiManagerScore`). Managers do not increment player club usage. A fixed ×13 is not introduced.
- Existing published player popularity is already calculated from all accepted squads, with one count per person per squad and clubs combined by person identity. It remains post-publication only and does not change appearance-based scoring.
- No daily schedule is invented. Manually released/open-ended challenges remain supported; no “check tomorrow” promise is added. The isolated pack 003 fixture now uses the explicitly requested next 00:00 GMT cutoff.
- Preview demonstration buttons, disabled-submission adapters and next-midnight clock were not copied into the release.

## Verification

- 15 tests passed across challenge standings/windows, SQLite and D1 parity, Worker request handling, submissions/retries, leaderboard/deep links, multiclub/manager scoring and saved progress (including stale data and blocked storage).
- Existing answer-selection browser suite passed using Edge.
- Existing fuzzy matching checks passed across all three packs (3,864 typo checks).
- Pages build prepares 67 public website files. `git diff --check` passes.
- Worker build dry run passed with the pinned Wrangler 4.147.0 and existing compatibility configuration; nothing uploaded or deployed.
- Browser review: desktop and 360/390/430px; no horizontal overflow at the requested mobile widths; confirmed actual visible cursor on/off states; real Čech answer adds 260 and survives refresh; completed squad and manager feedback; local submission and original-reference retry after refresh. Reduced-motion cursor behavior also tested.
- Isolated local server: `node tools/v4-review.cjs`, then `http://127.0.0.1:8086`. Its fixtures and submitted scores exist only in process memory. No production test submissions.

## Review and release

Screenshots are in the parent `outputs` directory: `v4-desktop.jpg`, `v4-mobile-360.jpg`, `v4-mobile-390.jpg`, `v4-mobile-430.jpg`, `v4-standing-desktop.jpg`.

Review the local build and diff before approving publication. The reviewed release is committed and pushed only to the v4.1.1_003 testing branch. Main, the live backend and Pages deployment remain unchanged. The backend endpoint changes need a separately approved Worker rollout alongside the website; old backends fail gracefully with deadline/standing unavailable. GitHub Pages environment approval remains a separate explicit step after a merge-commit PR release.

Latest feedback revisions: removed page-wide bold; answer lines use consistent 8px gaps; errors and retry prompts use the same dotted panel with red and yellow footballs respectively. Correct answers keep the white animated football. All answer-selection browser regressions passed after this change.

Final reviewed presentation: normal UI text weight; even 8px feedback gaps; identical animated football shapes (white success, red error, yellow retry); submitted answers remain white and status messages match the icon; additional player clubs use BONUS and short season ranges. Header wording is DEADLINE: [today] [cutoff] - [countdown], with only the countdown on mobile.
