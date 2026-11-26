**APPROVED for the combined release, 26 November 2026.** See [approval register](README.md); older review notes below are historical.

# New-game confirmation — review candidate v4.1.18_002

The question is centred in white. Where applicable, the reset warning appears as a separate centred block in bold Ceefax red (#FF0000), with natural wrapping on mobile. The submitted state shows only the question. Mobile rendering and all three state checks passed.

User-requested extension to the results flow. No main-repository push or merge is authorized yet.

Every player-triggered NEW GAME and PLAY AGAIN opens the same accessible, Teletext-styled modal before modifying game state. CANCEL, Escape and the close control preserve the game and submission attempt. Confirmation starts the current valid pack; quiet automatic rollover remains unchanged. The old post-reset browser alert is removed. The footer retains four controls.

Messages:

- Game in progress: “Are you sure you want to start a new game? Your current score will be reset!”
- Completed, no confirmed submission: “Are you sure you want to start a new game? Your previous results have not been submitted and your score will be reset!”
- Submitted (or an untouched game): “Are you sure you want to start a new game?”

Implementation: new-game.js, with shared styles in scores.css; PLAY AGAIN delegates to the same guarded newGame function. Tests cover all three messages, cancelling in-progress and completed games, Escape, confirmed reset, preserved submission details, four footer controls and mobile dialog bounds. Chromium/WebKit keyboard checks passed. Preview submissions remain disabled; the submitted-state branch is covered by automated tests using a confirmed backend receipt. Native device review pending.
