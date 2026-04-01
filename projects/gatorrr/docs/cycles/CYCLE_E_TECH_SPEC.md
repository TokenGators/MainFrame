# GATORRR — Cycle E Technical Specification
**Cycle:** E — Core Mechanics Overhaul (Entry, Dive, Bite)
**Reference:** CYCLE_E_PRD.md
**Audience:** Murphy (coder)
**Status:** Awaiting approval
**Last updated:** 2026-03-30

---

## Context

Three new systems touch the Gator entity, GameScene, CollisionSystem, and HUD. Read CYCLE_E_PRD.md first. Murphy designs and writes all implementation.

Stack: Phaser 3.90, Webpack 5, Babel, ES modules. All tunable values in `src/constants.js`.

---

## E1 — Gator Entry & Confinement

### Constants
```
GATOR_START_COL = 0          // bank position
RIVER_MIN_COL = 2            // leftmost river column gator can occupy
RIVER_MAX_COL = 16           // rightmost river column gator can occupy
GATOR_MIN_ROW = 1
GATOR_MAX_ROW = 10
```

### Gator States
Add an `entered` boolean to Gator: `false` on init, `true` once the gator moves into the river.

### Entry Logic
- While `entered === false`: gator can only move right (into the river). Left/up/down inputs are blocked.
- When gator moves from col 0 to col 1+: set `entered = true`, trigger splash visual (see below)
- Once `entered === true`: gator movement is constrained to `RIVER_MIN_COL` through `RIVER_MAX_COL`. Movement attempts to col 0, col 1, or cols 17+ are silently blocked.

### Splash Visual
- On entry: play a brief visual effect at the gator's position
- Implementation: add a splash sprite or use Phaser particles — Murphy's choice. Must resolve within ~500ms and not block input.
- If no splash sprite exists: a white rectangle that quickly fades/scales out is acceptable as placeholder.

### Level Reset
- GameScene.init() must reset `gator.entered = false` and reposition gator to GATOR_START_COL, center row.
- All other state resets already in place — verify they still work.

---

## E2 — Dive Mode

### Constants
```
DIVE_BREATH_MAX = 3000       // ms of dive time (3 seconds)
DIVE_BREATH_REGEN_RATE = 1   // breath per ms while surfaced (full refill = 3 seconds on surface)
DIVE_SURFACE_ALPHA = 0.4     // alpha for surface objects while gator is diving
```

### Gator Dive State
Add to Gator:
- `isDiving: boolean` — false by default
- `breath: number` — starts at DIVE_BREATH_MAX, depletes while diving, regenerates while surfaced
- `breathRegen: boolean` — true while surfaced, false while diving

### Input
- Space key held → dive (if `entered === true` and `breath > 0`)
- Space key released → surface
- While diving: normal movement inputs still work (gator moves underwater)
- Cannot dive while on bank (`entered === false`)

### Dive Behavior
While `isDiving === true`:
- Decrement `breath` by `delta` each update tick
- When `breath <= 0`: force surface (`isDiving = false`, play surface effect)
- Gator sprite: no tint change needed — the world changes around it
- All objects with depth 1 (logs, frogs): set alpha to DIVE_SURFACE_ALPHA
- Gator stays at depth 2 (full opacity)

While `isDiving === false` and `entered === true`:
- Regenerate `breath` by `DIVE_BREATH_REGEN_RATE * delta` per tick, cap at DIVE_BREATH_MAX
- All surface objects restore to alpha 1.0

### Collision Changes (CollisionSystem)
- Gator-log collision: skip if `gator.isDiving === true`
- Gator-frog collision (swimming frogs): only trigger if `gator.isDiving === false`
- On surface event (isDiving transitions false→false after auto-surface): run collision check immediately at new position before next frame

### HUD
- Add breath meter: a small bar below or next to HP
- Bar depletes left-to-right as breath is used
- Bar color: blue when full, orange when < 30%

---

## E3 — Bite Mode

### Constants
```
BITE_START_COUNT = 3         // bites per level
BITE_LOG_BONUS = 100         // points for destroying a log
```

### Gator Bite State
Add to Gator:
- `bites: number` — initialized to BITE_START_COUNT on each level
- `biteArmed: boolean` — true while Shift is held

### Input
- Shift held → `biteArmed = true`, visual indicator (Murphy's choice — tint, HUD highlight, etc.)
- Shift released → `biteArmed = false`
- Shift + arrow direction pressed (JustDown) → fire bite in that direction, if `bites > 0` and `!isDiving`
- While diving: bite inputs are ignored

### Bite Execution
On bite in direction D:
1. Calculate target tile: gator's current gridCol/gridRow + direction offset (1 tile)
2. Check target tile for:
   - **Log present** (log.gridCol === targetCol AND log.y overlaps targetRow): destroy log, score += BITE_LOG_BONUS, bites--
   - **Frog present** (frog.gridCol === targetCol AND frog.gridRow === targetRow): eat frog (normal score by type + BITE_LOG_BONUS if on a log), bites--
   - **Empty**: bites-- (wasted)
3. Bites cannot go below 0

### Log Destruction
- Remove the log from LogColumnManager.logs array
- Call log.destroy() (or equivalent cleanup)
- Log spawner continues unchanged — new logs will appear in normal rotation
- No special effect required for Cycle E (plain removal is fine)

### HUD
- Add bite counter: display as "BITES: X" or icons (Murphy's choice)
- Updates immediately on bite use
- At 0: display changes to indicate depleted (grey out or "BITES: 0")

### Collision Integration
- Bite collision check runs in GameScene or Gator.handleInput, not CollisionSystem (it's a targeted action, not a passive overlap)
- After bite resolves, normal collision check still runs that frame

---

## E4 — Scoring Updates

### Constants
Add to existing score constants:
```
SCORE_LOG_BREAK = 100        // per log segment destroyed by bite
```

### Score Events
- Normal frog eat (collision): unchanged
- Bite + frog only (no log): frog type value + 0 (same as collision eat, bite was wasteful but valid)
- Bite + frog on log: frog type value + SCORE_LOG_BREAK
- Bite + log only: SCORE_LOG_BREAK

All score updates go through the existing gameState.score mechanism.

---

## Integration Notes

### GameScene
- Pass `gator.isDiving` flag to CollisionSystem.checkAll() so it can gate log/frog collisions
- On level start/restart: reset `gator.entered`, `gator.breath`, `gator.bites`, reposition to bank
- Register Space key in GameScene.create() (not inside Gator — Gator receives the key state as a param or GameScene calls `gator.setDiving(bool)`)

### Gator Entity
- Gator is growing in complexity — Murphy should consider whether input handling belongs in Gator or GameScene. Either is acceptable as long as it's consistent and testable.

### Alpha Management
- When dive starts: iterate all logs and frogs, set alpha to DIVE_SURFACE_ALPHA
- When dive ends: iterate all logs and frogs, restore alpha to 1.0
- New logs/frogs spawned while diving should spawn at DIVE_SURFACE_ALPHA
- Murphy may want a centralized method in GameScene for this: `setDiveVisuals(bool)`

---

## Deliverables

Murphy delivers:
1. All source changes for E1–E4
2. Clean build
3. Summary of key implementation decisions (especially dive alpha management and bite collision approach)
4. Commit: `feat[gatorrr] cycle E - entry system, dive mode, bite mode`
5. Pushed to remote

Do not proceed to QA without confirming all 19 success criteria from the PRD are implemented.
