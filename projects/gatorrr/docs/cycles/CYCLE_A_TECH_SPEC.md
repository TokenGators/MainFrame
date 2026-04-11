# GATORRR — Cycle A Technical Specification
**Cycle:** A — Foundation Stability  
**Reference:** CYCLE_A_PRD.md  
**Audience:** Murphy (coder)  
**Status:** Awaiting approval  
**Last updated:** 2026-03-23

---

## Context

This spec defines the logic constraints and system behavior for Cycle A. Murphy designs and writes the implementation. No code is prescribed here — build it the right way for the stack (Phaser 3, Webpack, Vanilla JS).

Current stack: Phaser 3.90, Webpack 5, Babel, ES modules.  
All tunable values must be exported constants in `src/constants.js`.  
All pixel math must use the `TILE` constant — no hardcoded pixel values.

---

## A1 — Smooth Gator Movement

### System Constraints
- Movement is tile-based. The gator always occupies exactly one grid tile (gridCol, gridRow).
- One input = one tile of movement.
- Grid boundaries: col 0–19, row 0–10. Gator cannot move outside these bounds.

### Behavioral Rules
1. When directional input is detected and the gator is not currently in motion, begin a move.
2. A move consists of: updating the logical grid position, then animating the sprite to the corresponding pixel position.
3. Animation duration: 80ms. Linear easing.
4. While a move animation is active, all movement input is ignored.
5. When animation completes, if the same key is still held, immediately begin the next move.
6. The physics body must remain synchronized with the sprite's pixel position throughout the animation — not just at the start and end.
7. When moving left: flip sprite horizontally. When moving right: restore default orientation. Up/down movement does not change sprite orientation.
8. Damage cooldown logic is unchanged. Gator can take damage while moving.

### Constants to Define
- Move animation duration (ms) — recommended starting value: 80

### Integration Notes
- Collision detection reads gridCol/gridRow — these must be updated at the start of the move, before the animation completes.
- The physics body position must track the sprite during animation for collision accuracy.

---

## A2 — Log Balance

### System Constraints
- The river spans columns 2 through 16 inclusive — 15 columns total.
- All 15 river columns must have logs. No empty river columns.
- At level 1: 2 logs per column.
- Each column has one speed and one direction for all its logs.
- Direction alternates per column (col 2 moves one direction, col 3 the opposite, etc.).

### Behavioral Rules
1. Logs within a column are distributed evenly across the screen height at spawn — not clustered.
2. Each log has a random height of 2 or 3 tiles.
3. Gap between consecutive logs in the same column must be at least 48px. Gaps can be randomized within a range — add a wider maximum to create variation.
4. When a log moves off one edge of the screen, it wraps to the opposite edge.
5. Log width is defined by LOG_WIDTH constant — should visually fill most of the column.

### Constants to Define/Update
- `NUM_LOG_COLUMNS`: 15
- `LOG_GAP_OPTIONS`: minimum 48px, maximum 112px, range of values for variety
- Level 1 logs per column: 2 (this will become part of the level config system in Cycle D)

### Integration Notes
- Log wrapping must be smooth — log reappears on the opposite edge with no visual gap.
- Log grid column (`log.gridCol`) must always reflect the column it was spawned in — it does not change as the log moves.

---

## A3 — Game Over Screen

### System Constraints
- Three distinct end states: Win, Lose-HP, Lose-Pads.
- The game over scene receives the full game state object from GameScene at transition time.
- Game state must include: frogsEaten, padsFilled, timeLeft (ms), hp, win (bool), score.

### Behavioral Rules

**Win state triggers when:** frogsEaten reaches 10.  
**Lose-HP triggers when:** gator hp reaches 0.  
**Lose-Pads triggers when:** padsFilled reaches 5.

**Screen content for each state:**

Win:
- Heading indicating victory
- Stats: frogs eaten, pads filled, time remaining, score

Lose-HP:
- Heading indicating defeat
- Reason: lost all HP
- Stats: frogs eaten, pads filled, time survived, score

Lose-Pads:
- Heading indicating defeat
- Reason: all pads filled
- Stats: frogs eaten, pads filled, time survived, score

**Score display (Cycle A):** Score = frogsEaten × 200. This is a placeholder — the full score system ships in Cycle B. The field label should read "Score" so it carries forward without UI changes.

**Restart behavior:** A single keypress (R) restarts the game. All game state is fully reset — no carryover from the previous session. The scene must be safe to restart rapidly without crashing.

### Integration Notes
- GameScene must pass complete gameState to the GameOverScene on all three exit paths.
- BootScene and TitleScene are not re-run on restart — only GameScene resets.

---

## A4 — Title Screen

### System Constraints
- Title screen is the first interactive screen the player sees after assets are loaded.
- BootScene handles asset preloading (already implemented) — it should transition to TitleScene, not GameScene.
- TitleScene transitions to GameScene on any key input.

### Screen Content Requirements
- Game title (prominent)
- One-sentence game description
- Controls section: movement keys, objective
- Win condition: eat 10 frogs
- Lose conditions: HP reaches 0, or 5 pads filled
- Start prompt: "Press any key to start" — must be visually distinct and blink/pulse to indicate interactivity

### Behavioral Rules
1. Any keyboard input starts the game.
2. The start prompt blinks at a natural pace — not too fast, not too slow.
3. For Cycle A: no high score display on title screen (added in Cycle B).

### Integration Notes
- TitleScene must be added to the Phaser scene registry.
- BootScene.create() transitions to TitleScene (not GameScene).
- GameOverScene restart transitions to GameScene directly (not TitleScene) — player doesn't need to re-read the title on every restart.

---

## Deliverables

Murphy delivers:
1. All source file changes implementing A1–A4
2. A clean build (npm run build passes with no errors)
3. A brief summary of what was changed and any decisions made during implementation
4. Git commit on branch `agent/gatorrr/fix-crash-and-phase2` with message: `feat[gatorrr] cycle A - smooth movement, log balance, game over, title screen`
5. Pushed to remote

Do not proceed to Cycle B until QA has reviewed and Operator has approved.
