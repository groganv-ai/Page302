# Page302 release instructions

- Every website update must increment the application version in `script.js` (`APP_BUILD`) before review and release. Check that the displayed build label matches the intended release version.
- Versions use `vMAJOR.MINOR.PATCH_PACK`, for example `v3.7.10_003`. Increment the application patch for routine updates (preserving two-digit formatting below 10). The final `_003` identifies game pack 003; change this suffix only when the game pack changes.
- Start release branches from the latest approved `origin/main`, preserving existing branches and unrelated files.
- Present changes for review before pushing or merging. Merge pull requests with a merge commit. GitHub Pages deployment requires separate explicit user approval after the workflow pauses for environment review.
