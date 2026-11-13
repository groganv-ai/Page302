# Page302 v4.1.08 release

Base: approved origin/main 3e77f0d8061c3fcca087eb2fe8f1243f3aba3bbb.
Branch: codex/v4.1.08-beta-feedback.
APP_BUILD: v4.1.08_002. The existing scheduler replaces the displayed pack suffix with the active pack number.

## Final changes

- LEADERBOARD TOP 30, 15 rows per page, including cutoff ties. Separate SCORE and RARITY buttons select the metric and toggle highest/lowest ordering. Equal metric and guess totals share rank. Ranking uses all published submissions before applying the cutoff.
- One Code search field, SEARCH button, no TOP 25 button. Clear Code and search to restore the table. Codes are hidden in rows/details but remain in public API data and permanent links.
- Full club names and short seasons in a collapsed CLUBS / SEASONS section, with white names, cyan seasons and green horizontal borders. TEAM aligns with its first colour block.
- Rarest Player/Players dropdown: shared percentage above names only. Counts each player once per submitted squad across all published results; excludes managers and unselected players.
- Club usage appears as (1), (2), etc., with no unused-club count. Legends have aligned vertical separators and centred values, showing actual base points and usage multipliers.
- Both legends sit below the answer bar on desktop; PLAYER RARITY precedes CLUB USAGE on mobile.
- Answer feedback: name; rarity and base points; club/season, count and multiplier; exact awarded total. Player totals: white <=260, yellow 261–519, green 520–779, cyan 780–1039, magenta >=1040. Manager totals: white <40, yellow 40–59, green 60–79, cyan 80–99, magenta >=100.
- STYLE_GUIDE.md records uppercase buttons and points colours.

## Validation

13 tests passed covering leaderboard browser flows, ranking/ties, rarest-player accounting, submissions and idempotent retries, multi-club/player/manager scoring, saved-game recovery and the approved daily calendar. Gameplay layout checked at seven widths, including hint placement and mobile ordering.

Running preview http://127.0.0.1:8088 passed with 30 local sample results: two pages of 15, both ranking directions, Code search/reset, expanded clubs, colour boundaries, exact Raya feedback and mobile overflow checks. Preview uses a separate local database; no remote score-service requests were made. An optional Google Fonts request was blocked during testing.

## Schedule and score preservation

No changes to backend/, data/, progress.js, scores-client.js, challenge-client.js or .github/. No database migrations, score recalculation, publication rebuild, scheduler upload, Worker deployment or live writes are part of this release. Website build includes the new results-ranking.js asset. Published results are read using the existing API.

## Release procedure

1. Review the source archive and website artifact. Source archive overlays only the listed changed files onto the approved repository; it is not a full repository replacement.
2. Commit/push the release branch and create a PR only after review approval. Merge with a merge commit.
3. GitHub Pages workflow builds the website. Obtain separate explicit deployment approval when the github-pages environment review pauses.
4. Do not redeploy the Worker, reseed a database, change calendar/packs or run release-scheduler administration for this website update.
5. After deployment, verify the v4.1.08 build with the currently scheduled suffix, current game/closing time, leaderboard and an existing result reference. Use read-only checks; do not create test live submissions.
6. Roll back website code if necessary; retain current backend/database/calendar and pack data.

No push, merge or live deployment has been performed.
