# Page302 v4.1.21_002

This release combines five independently approved improvements to the existing game.

- iOS answer entry: Enter dismisses the keyboard, the answer field stays visible, and viewport correction no longer loops. Selecting a club jumps to formation when a position is still needed.
- Results: completing a game replaces ABOUT with RESULTS in the four-control footer. Players can reopen the result and submit without losing their existing submission attempt.
- New game: one styled confirmation handles in-progress, completed-but-unsubmitted and submitted games. Text is centered, reset warnings are bold red, and cancellation preserves the game.
- Club sorting: one icon at the right of CLUBS cycles original order, alphabetical, season rank and year. The heading indicates (A/Z), (#1) or (yrs); rows contain no rank numbers. Sorting preserves the pack and gameplay state.
- App icon: the approved pixel-football design now uses five scoring-colour blocks, with versioned favicon, Apple touch icon and manifest references.

Scout and 11 Club Challenge are not included. Game packs, scoring rules, backend and release schedule are unchanged.

## Validation

13 checks passed on the isolated release branch: Chromium/WebKit sorting and keyboard checks; full-team gameplay and seven responsive widths; results reopening and all confirmation states; retry after a lost submission receipt; eligibility; leaderboard; saved progress; result ranking; multi-club scoring. The website builder packaged 125 files using an explicit allowlist, including the new runtime modules. Test output and review tools are excluded from the deployed website.

The displayed source build is v4.1.21_002; the existing scheduler substitutes the active pack suffix. Native iPhone approval was supplied during review. Installed icon caching remains controlled by the device.

## Release state

Prepared from origin/main at 46b1596c5d6a49eab27b23b8f763ac9446f29093 on branch codex/core-features-release-v4.1.21. All included features are approved. Awaiting approval to push and merge the combined release; no remote changes have been made. Use a merge commit. GitHub Pages deployment requires separate approval after its environment review pauses.
