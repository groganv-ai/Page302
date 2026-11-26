## 1. Scout Search and spelling assistance

Story: As a player, I can get useful help for the selected club and vacant position without accidentally choosing an ineligible or already-used person.

Requirements and acceptance criteria:

- Reuse existing normalization, aliases, eligibility and exact-match precedence. Preserve one-edit/transposition surname assistance and ambiguity selection.
- Hints must respect the selected club and position, occupied slots, used people and caretaker exclusion. A wrong-position exact name must never silently become another person.
- Starting Scout allowance: XI = 3; VI = 1. These are the user's specified allowances, not authorization to introduce a new VI game mode.
- Replenish 1 Scout after every 3 correct answers made without using a Scout. Track qualifying accepted answers and persist allowance/replenishment progress across reload; opening a menu, replaying recovery or retrying a submission must not replenish it twice.
- Show Scout availability and an accessible explanation when unavailable. No allowance cap or consecutive-answer reset rule has been specified; do not silently impose either.
- Do not charge a guess merely for opening/cancelling a Scout control. Keep accepted-answer scoring unchanged.
- Hint contents and the precise point at which an answer becomes Scout-assisted still need to be established from existing design work or the user before implementing those mechanics.

Tests: XI starts at 3 and existing VI, if present, at 1; no replenishment at 1 or 2 qualifying answers; +1 at 3 and again at 6; Scout-assisted answers do not increment the qualifying total; recovery does not double-award. Also selected/unselected club and position; occupied slot; manager eligibility; no remaining candidates; accented and compound surnames; exact versus fuzzy collision; short surnames; ambiguous match; repeated hint; cancel; reload; new daily pack; disabled storage.
