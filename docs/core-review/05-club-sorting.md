**APPROVED for the combined release, 26 November 2026.** See [approval register](README.md); older review notes below are historical.

## 5. Club list sorting

Story: I can view the same clubs in default, alphabetical, year or rank order without changing my game.

Requirements and acceptance criteria:

- DEFAULT restores original pack order. ALPHABETICAL compares full club names. YEAR compares parsed season start years with stable ties.
- RANK means league finishing position for that club's specific season, as confirmed by the user. Existing game-pack club objects inspected do not establish this field; obtain the correct season-specific data before enabling rank sorting. Never substitute club usage or current league standings.
- Expose selected sort and direction accessibly; visible control labels are uppercase. Preserve club selection, usage colors, counts, focus, hints and pending-answer validity.
- Sort a view/copy; never mutate authoritative pack order or cached pack data. Sorting has no scoring effect.
- Default rank direction is best finishing position first (1 before 2); provide a direction toggle. Keep ties stable. Missing rank data must be visibly unavailable and sorted last, never invented.

Tests: all four orders; equal years/ranks; default restoration; selected club survives sorting; used-club counts/colors; new pack; keyboard operation; mobile overflow; pack signature remains unchanged.

## Review candidate — v4.1.19_002

Superseded UI by v4.1.20_002: a single filter icon at the right of the CLUBS headline cycles DEFAULT → ALPHABETICAL → RANK → YEAR → DEFAULT. The title reads CLUBS, CLUBS (A/Z), CLUBS (#1), or CLUBS (yrs). Rank numbers are removed from rows. The previous direction-reversal controls and explanatory line are removed at the user's request. Keyboard activation keeps focus on the icon, with an accessible label identifying current and next mode. These changes remain pending user review.

Implemented as separate `club-sorting.js`, `club-sorting.css` and generated `club-sort-data.js`. The renderer sorts a copy on each draw; the game pack and scoring remain unchanged. Clicking the selected sort reverses direction. DEFAULT restores pack order. Alphabetical sorting uses canonical full names; rank view displays finishing numbers, with unknown values marked N/A and last in either direction.

Historical data comes from the existing saved All Teams inspection at `outputs/historical-club-list/Historical Premier League Club list - completed.xlsx.inspect.ndjson`. Its columns identify season, final rank, canonical name and short code. `tools/build-club-sort-data.cjs` validates and extracts 686 club-season records, preserving workbook provenance (existing workbook, Fjelstul English Football Database, Football-Data calculated tables). No live standings or usage counts are used. All 11 pack 003 clubs have rank data. Unknown future seasons remain unavailable until data is refreshed.

Chromium and WebKit checks passed for actual pack orders in both directions, stable rank ties, missing data, original pack preservation, selected club/usage colour preservation, keyboard focus and mobile control widths. Awaiting user review; not approved for the combined release yet.
