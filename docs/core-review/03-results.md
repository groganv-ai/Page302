**APPROVED for the combined release, 26 November 2026.** See [approval register](README.md); older review notes below are historical.

## 3. Reopen current-day results and duplicate-safe submissions

Latest review revision: v4.1.16_002 keeps exactly four footer controls. RESULTS replaces ABOUT in its existing third slot after completion; ABOUT returns when no current completed result is available or a new game starts. No additional button appears above the footer. This supersedes the placement described in the initial implementation notes below. The user's keyboard approval is unchanged; results behavior is still awaiting approval.

Status, 26 November 2026: implemented for review in v4.1.14_002; not approved or pushed to the Page302 repository. The isolated test Site now includes RESULTS reopening. Live score submissions remain disabled there and show an explicit test-preview message. [Implementation](../../results-reopen.js) is a separate module with one script include in index.html. Removing that module/include removes this feature without reverting approved iOS work. Approved iOS source diff and its focused test are preserved under .local/approved-features.

The RESULTS button appears above the footer after completion. Opening it changes the overlay visibility only; score, guesses, initials, request ID, saved receipt and submission guards stay intact. Live clicks recheck the release schedule and revision. Missing/failed schedules, pack changes and release gaps block reopening. The button also refreshes on tab resume and every 30 seconds; explicit offline test mode permits its embedded test pack without a live schedule.

Validation: score-submission, progress recovery, Chromium keyboard and WebKit keyboard tests passed. Added assertions cover close/reopen with unsent initials, no automatic submission, saved receipt retention, one database submission after reopening, a live schedule gap rejecting a previously visible button, and PLAY AGAIN hiding the control. User visual/device review remains pending. The separate keyboard Site remains on the approved v4.1.13 candidate; no test Site update is included in this local implementation.

Story: After completing today's game, I can close and reopen my result without losing it or submitting it twice.

Requirements and acceptance criteria:

- Offer RESULTS only for a completed result belonging to the active daily pack. Validate against the release schedule rather than the device's date alone.
- Reopening changes presentation only: retain score, guesses, picks, initials, request ID and receipt. It must not allocate a new attempt or send a submission automatically.
- Preserve existing in-flight and saved guards. Lost-response retries must reuse the original request ID and frozen content, including after reload.
- At rollover, closure or the scheduled gap, prevent the current-day reopen control from exposing an old result as today's. Preserve historical leaderboard/deep-link behavior.
- Fail safely when release state is unavailable; do not infer a new current pack from stale state.

Tests: close/reopen before and after save; double-click submit; slow request; lost response; retry/reload; invalid receipt; expired pack; midnight gap; tab resume; changed pack signature; play again; historical result links remain functional.
