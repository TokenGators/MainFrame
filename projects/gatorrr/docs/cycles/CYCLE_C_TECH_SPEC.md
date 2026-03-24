# GATORRR — Cycle C Technical Specification
**Cycle:** C — Health Power-Ups & Frog AI  
**Reference:** CYCLE_C_PRD.md  
**Audience:** Murphy (coder)  
**Status:** Awaiting approval  
**Last updated:** 2026-03-23

---

## C1 — Health Power-Ups

### Constants (src/constants.js)
```
POWERUP_SPAWN_INTERVAL = 20000   // ms between spawns
POWERUP_DURATION       = 8000    // ms visible before despawn
POWERUP_HP_RESTORE     = 1       // HP restored on collect
```

### Spawn Logic
- A timer in GameScene fires every `POWERUP_SPAWN_INTERVAL` ms
- On fire: pick a random valid grid position and spawn a PowerUp entity
- Valid positions: any tile in rows 1–10 that is not col 0 (left bank), not col 1 (lily pad zone), not col 17–19 (right bank), and not currently occupied by a log
- If no valid position is found on the first try, pick another random position (retry up to 5 times — if still no valid position, skip this spawn)
- Maximum 1 power-up on screen at a time — if one already exists, skip this spawn

### PowerUp Entity
- New entity class: `src/entities/PowerUp.js`
- Visual: white rectangle, TILE × TILE size, with a red cross drawn on top
  - Red cross: two rectangles — one horizontal, one vertical, centered on the tile, each approximately 1/3 TILE in width/height
  - No external asset required
- Depth: above background, below gator (depth 1.5 or equivalent)
- On spawn: start a timer for `POWERUP_DURATION` ms. On timer complete: destroy self, remove from GameScene's powerUp reference

### Collection Logic
- In CollisionSystem, add gator-vs-powerUp collision check
- On collision: call `powerUp.collect(gator)` or equivalent
  - Increase gator HP by `POWERUP_HP_RESTORE`, capped at `MAX_HP`
  - Brief visual feedback on gator (tint flash — different color from damage flash)
  - Destroy power-up immediately
  - Remove from GameScene's active powerUp reference

### GameScene Integration
- GameScene maintains a single `this.powerUp` reference (null when none active)
- PowerUp spawner uses a Phaser time event (loop)
- Pass `this.powerUp` to CollisionSystem.checkAll()

### Edge Cases
- Power-up must be safely destroyable at any time (scene shutdown, restart, collection, timer expiry)
- If the game ends while a power-up is active, it is cleaned up with the scene

---

## C2 — Frog AI — Smart River Crossing

### Constants (src/constants.js)
```
FROG_SMARTNESS = 0.75   // 0.0 = always jumps blindly, 1.0 = never jumps into water
```

### Frog States
Replace current state model with:
- `ON_BANK` — frog is on the right bank, waiting to enter the river
- `ON_LOG` — frog is riding a log, scanning for next log
- `SWIMMING` — frog is in the water (slow, vulnerable)

Remove `VULNERABLE` state — vulnerability is now implicit when `SWIMMING`.

### State Transition Rules

**ON_BANK → ON_LOG:**
- On decision tick: check if a log exists in the adjacent river column (col 16) that overlaps the frog's current row ± 1 tile
- If log found: jump onto it, set state to `ON_LOG`, attach to log
- If no log: wait (stay ON_BANK)

**ON_LOG behavior:**
- While ON_LOG: frog's y position moves with the log (frog rides the log vertically)
- frog.y = log.y + frog's offset from log top
- On decision tick: check if a log exists in the column to the left that overlaps the frog's current y position ± 1 tile (the "landing zone" check)
- **Smart jump (probability = FROG_SMARTNESS):** if a log is in the landing zone → jump to it
- **Wait:** if no log in landing zone AND smart → wait (stay ON_LOG)
- **Dumb jump (probability = 1 - FROG_SMARTNESS):** if no log in landing zone but dumb → jump anyway → land in water → set state SWIMMING

Special case: if frog reaches column 1 while ON_LOG, treat as reaching lily pad zone — existing lily pad collision logic applies.

**SWIMMING behavior:**
- Move left at half the normal frog decision speed
- On each decision tick: check if a log in the current column overlaps the frog's y ± 1 tile
- If log found nearby: jump onto it (ON_LOG)
- SWIMMING frogs are vulnerable — gator collision eats them (no change to CollisionSystem needed beyond confirming it checks all frogs regardless of state)

### Log Attachment
When a frog is ON_LOG:
- Store a reference to the log the frog is riding: `frog.currentLog`
- In frog.update(), if ON_LOG: sync frog's y to `currentLog.y + frog.logOffset`
- `frog.logOffset` is set when the frog first lands on the log (difference between frog.y and log.y at time of landing)
- If the log the frog is riding wraps off screen: frog detaches, transitions to SWIMMING at current position

### Landing Zone Check
A log is "in the landing zone" for a frog if:
- `log.gridCol === frog.gridCol - 1` (one column to the left)
- `log.y <= frog.y + TILE` AND `log.y + log.height >= frog.y - TILE` (vertical overlap within 1 tile)

### Decision Tick
- Frogs make decisions on a timer: `FROG_DECISION_INTERVAL` (already defined)
- Decision tick logic replaces the existing `makeDecision()` method entirely

### Visual Distinction
- SWIMMING frogs: apply a semi-transparent tint or alpha reduction (e.g., 70% alpha) to indicate they're in water
- ON_LOG frogs: normal appearance
- Murphy chooses the exact implementation — the visual difference must be clear to the player

### Frog Spawning
- Frogs still spawn on the right bank (col 17–19)
- Initial state: ON_BANK
- Initial position: random row 1–10

---

## Deliverables

Murphy delivers:
1. All source changes for C1 and C2
2. Clean build
3. Summary of implementation decisions (especially frog AI state machine design choices)
4. Commit: `feat[gatorrr] cycle C - health powerups, smart frog AI`
5. Pushed to remote

Do not proceed to Cycle D without QA approval and Operator sign-off.
