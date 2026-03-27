# GATORRR — Smoke Test Suite
**Version:** 1.0
**Last updated:** 2026-03-26
**Purpose:** Run after every cycle before cycle-specific QA. Catches regressions in critical-path functionality.

---

## Instructions for QA

These tests must pass before running any cycle-specific test plan. If any smoke test fails, stop and report immediately — do not continue to cycle tests.

Read source files to verify. Do NOT use git log or git diff.

Core files to check:
- `src/scenes/BootScene.js`
- `src/scenes/TitleScene.js`
- `src/scenes/GameScene.js`
- `src/scenes/GameOverScene.js`
- `src/entities/Gator.js`
- `src/entities/Frog.js`
- `src/managers/FrogSpawner.js`
- `src/managers/CollisionSystem.js`
- `src/managers/LogColumnManager.js`
- `src/constants.js`
- `src/main.js`

---

## TC-SMOKE-01 — Game Launches to Title Screen
Given: Page is loaded fresh
When: BootScene runs
Then: TitleScene is displayed — not GameScene, not a black screen
Expected: BootScene transitions to TitleScene. All assets referenced in `preload()` exist in `public/assets/`.

**Verify:**
- BootScene.preload() loads only files that exist (check each `load.image` key against known assets)
- BootScene transitions to 'TitleScene' (not 'GameScene')
- TitleScene is registered in main.js scene array

---

## TC-SMOKE-02 — Title Screen Content
Given: TitleScene is displayed
When: Player reads the screen
Then: Title, description, controls, win/lose conditions, and blinking start prompt are present
Expected: All required text content exists in TitleScene.create(). Blinking tween is present.

---

## TC-SMOKE-03 — Game Starts
Given: TitleScene is displayed
When: Any key is pressed
Then: GameScene starts — gator, logs, and frog spawner are initialized
Expected: TitleScene transitions to 'GameScene' on keydown. GameScene.create() initializes gator, logManager, frogSpawner, collisionSystem.

---

## TC-SMOKE-04 — Frog Spawns Without Crash
Given: GameScene is running
When: FrogSpawner.spawnFrog() is called
Then: A frog is created without error
Expected:
- `new Frog(scene, col, row, type)` — type must exist in `FROG_TYPES`
- `FROG_TYPES[type].sprite` exists and is a valid loaded texture key
- No undefined property reads in Frog constructor

**Check FROG_TYPES entries — each must have:** `points`, `sprite`, `color`, `weight`
**Check FROG_SPAWN_WEIGHTS** — keys must match FROG_TYPES keys exactly

---

## TC-SMOKE-05 — Gator Eats Frog Without Crash
Given: Gator overlaps a frog
When: CollisionSystem.checkGatorFrogCollision() runs
Then: Frog is removed, score increments, ScorePopup appears — no crash
Expected:
- `FROG_TYPES[frog.type].points` is a valid number
- `FROG_TYPES[frog.type].color` is a valid hex integer (not undefined)
- ScorePopup constructor receives valid color and calls `.toString(16)` without error
- `gameState.score` increments correctly

---

## TC-SMOKE-06 — Gator Takes Damage Without Crash
Given: Gator overlaps a log
When: CollisionSystem.checkGatorLogCollision() runs
Then: Gator HP decrements, damage flash plays — no crash
Expected:
- `gator.takeDamage()` runs without error
- HP decrements by 1
- Damage cooldown prevents immediate re-damage

---

## TC-SMOKE-07 — Game Over Screen Appears
Given: Gator HP reaches 0
When: GameScene.update() detects hp <= 0
Then: GameOverScene (or GameOverScene transitioning to LeaderboardScene) appears with correct stats
Expected:
- gameState is passed to GameOverScene
- GameOverScene.init(data) receives gameState without error
- All gameState fields referenced in GameOverScene exist (frogsEaten, padsFilled, timeLeft, score, hp, win, currentLevel)

---

## TC-SMOKE-08 — Restart Works
Given: Game over screen is displayed
When: Player presses R (or restart key)
Then: Game restarts at level 1 with reset state — no crash
Expected:
- GameScene starts fresh with level=1, score=0
- All previous entities are cleaned up (no duplicate physics bodies, no lingering tweens)
- HUD shows correct initial values

---

## TC-SMOKE-09 — No Missing Imports
Given: Source files are read
When: All import statements are checked
Then: Every imported name exists in the imported module
Expected: Check for common regression patterns:
- Constants imported by name must exist in constants.js
- Classes imported must be exported from their file
- No `undefined` used where a constant is expected

**Specifically check:**
- `FrogSpawner.js` — does not reference `FROG_SPAWN_MIN`/`FROG_SPAWN_MAX` directly (uses levelConfig)
- `CollisionSystem.js` — imports `TILE`, `FROG_TYPES`, `SCORE_PAD_PENALTY`
- `GameScene.js` — imports `DEV_MODE` if DevPanel is instantiated

---

## TC-SMOKE-10 — Build Passes
Given: Source files are syntactically valid
When: `npm run build` is run
Then: Build completes with no errors
Expected: No webpack errors. Warnings about bundle size are acceptable. Any actual errors are a blocker.

**Note for QA:** You cannot run the build directly. Instead, verify that:
- All files have matching open/close braces and brackets (scan for obvious syntax issues)
- All class exports match their import names
- No duplicate const declarations in constants.js

---

## Smoke Test Reporting

Report format:
```
SMOKE TEST RESULTS
TC-SMOKE-01: PASS/FAIL — [notes]
TC-SMOKE-02: PASS/FAIL — [notes]
...
TC-SMOKE-10: PASS/FAIL — [notes]

OVERALL: PASS (proceed to cycle tests) / FAIL (stop — list blocking issues)
```

If ALL pass: proceed to cycle-specific test plan.
If ANY fail: report immediately, do NOT run cycle tests.
