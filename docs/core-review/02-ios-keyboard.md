**APPROVED for the combined release, 26 November 2026.** See [approval register](README.md); older review notes below are historical.

## 2. iOS keyboard and answer bar

Story: As an iPhone player, I can dismiss the keyboard and still see and use the answer bar and feedback.

Requirements and acceptance criteria:

- Provide an explicit accessible dismissal action while editing; blur the answer input without submitting or clearing it.
- Keep the answer bar reachable within the visual viewport on keyboard appearance, dismissal, orientation changes and browser toolbar movement. Respect safe-area insets and reduced motion.
- Avoid refocusing the input after accepted answers, choice cancellation or dismissal unless the player selects a new input target. Preserve Enter and composition-event behavior.
- Do not obscure dialogs or prevent page scrolling. Keep existing desktop input behavior.

Tests: iPhone portrait/landscape, narrow screen, keyboard open/closed, Enter, touch submission, IME composition, invalid answer, ambiguous answer, modal opening and repeated selection. Automated WebKit geometry checks plus a real iPhone Safari keyboard check are required; Chromium mobile emulation alone is insufficient.
