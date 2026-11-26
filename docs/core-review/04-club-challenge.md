## 4. 11 Club Challenge

Story: During the existing core game, I can track an 11-club chain and its potential +1,100 bonus.

Requirements and acceptance criteria:

- Integrate within the existing game, without a separate mode. Show progress, potential bonus and earned bonus distinctly.
- Award at most 1,100 once under the agreed completion rule. Failed guesses, duplicate answers, reopening, rendering and recovery must not award it again.
- Preserve base rarity, player/manager and linked-club calculations. Keep displayed total, shared result, saved progress and submitted score consistent.
- Recover chain state by replaying accepted answers, rather than trusting stored bonus totals. Define compatibility for games saved before this feature before implementation.
- The chain counts accepted player answers using only the club selected for that answer. Other linked clubs do not advance the chain. Managers do not count.
- Repeating a club breaks the chain. Eleven distinct selected clubs across the eleven player slots qualify for the +1,100 completion bonus; do not award partial bonuses. A manager does not advance or break player-chain progress.

Tests: zero through eleven clubs; repeated club; invalid/ambiguous/cancelled answer; manager; linked clubs; completion twice; reload mid-chain and after completion; submission retry; prior-version recovery; all supported formations.
