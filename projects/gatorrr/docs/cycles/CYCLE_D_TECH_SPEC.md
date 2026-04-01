# GATORRR — Cycle D Technical Specification
**Cycle:** D — Level System & Difficulty Ramp  
**Reference:** CYCLE_D_PRD.md  
**Audience:** Murphy (coder)  
**Status:** Awaiting approval  
**Last updated:** 2026-03-23

---

## D1 — Level System

### Constants (src/constants.js)
Define a level configuration array. Each entry defines the parameters for that level. Level indices are 0-based internally (level 1 = index 0).

```
LEVEL_CONFIGS = [
  { logsPerCol: 2, speedMin: 20, speedMax: 50,  spawnMin: 1500, spawnMax: 2250 }, // Level 1
  { logsPerCol: 2, speedMin: 30, speedMax: 65,  spawnMin: 1250, spawnMax: 2000 }, // Level 2
  { logsPerCol: 3, speedMin: 40, speedMax: 80,  spawnMin: 1000, spawnMax: 1750 }, // Level 3
  { logsPerCol: 3, speedMin: 50, speedMax: 95,  spawnMin: 800,  spawnMax: 1500 }, // Level 4+ (max)
]
```

Accessing a level beyond the last entry returns the last entry (level 4 is the cap).

### Level State
- Add `currentLevel` to `gameState` — starts at 1
- Add `totalScore` to carry accumulated score across levels — separate from `gameState.score` (per-level score events) or merge into one running total. Murphy's choice — must be clear which value is displayed and which accumulates.

### Win Condition Change
- When `frogsEaten` reaches 10: do NOT transition to GameOverScene
- Instead: transition to LevelClearScene, passing `{ level: currentLevel, score: currentScore }`
- LevelClearScene waits 2 seconds, then transitions to GameScene with `{ level: currentLevel + 1, score: carryScore }`

### GameScene Init with Level Data
- GameScene.init(data) receives `{ level, score }` from LevelClearScene
- If no data (fresh start): level = 1, score = 0
- GameScene resets: HP to MAX_HP, pads cleared, frogs cleared, timer to 60000
- GameScene does NOT reset score — carries forward
- GameScene reads `LEVEL_CONFIGS[Math.min(data.level - 1, LEVEL_CONFIGS.length - 1)]` to get parameters for this level
- LogColumnManager and FrogSpawner must accept level config parameters at construction time (not read directly from constants) so they can be varied per level

### HUD Update
- Add level display to HUD: "LVL: X"
- Level does not change mid-level

### Restart Behavior
- Game over screen restart (R key) → GameScene with level 1, score 0
- This is unchanged from Cycle A — just ensure level resets to 1

---

## D2 — LevelClearScene

### New file: src/scenes/LevelClearScene.js

Content requirements:
- Display "LEVEL X CLEARED" prominently
- Display current accumulated score
- A brief secondary line (e.g., "Get ready for Level X+1...")
- Auto-advance to next level after 2000ms — no player input required
- No restart option on this screen

### Scene registration
- Add LevelClearScene to the scene registry in main.js

---

## D3 — Leaderboard Level Recording

- When saving a leaderboard entry (Cycle B), the `level` field must reflect the level the player was on when the game ended
- For a game-over loss on level 3, `level = 3`
- For a loss on level 1, `level = 1`
- This requires `gameState.currentLevel` to be passed to GameOverScene along with the rest of gameState (it already should be, if gameState is passed in full)

---

## Deliverables

Murphy delivers:
1. All source changes for D1, D2, D3
2. Clean build
3. Summary of implementation decisions (especially score carry/reset design)
4. Commit: `feat[gatorrr] cycle D - level system, difficulty ramp, level clear screen`
5. Pushed to remote

QA approval and Operator sign-off required before any further work.
