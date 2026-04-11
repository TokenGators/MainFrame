# GATORRR v3 — Full Shipping Spec

**Status:** Planning — awaiting approval before development  
**Branch:** agent/gatorrr/fix-crash-and-phase2  
**Owner:** Kthings  
**Last updated:** 2026-03-23

---

## 🔴 Must-Haves (Blockers for v1)

### 1. Crash-free full playthrough
- No crashes at any point during a full session
- Win and lose conditions both trigger cleanly
- Restart works without reload

### 2. Game Over / Win screen
- Win screen: "YOU WIN 🐊" + frogs eaten, time remaining, final score
- Lose screens: separate for HP=0 and all pads filled
- Show final score breakdown (frogs eaten, time bonus, pad penalty)
- "Press R to restart" or on-screen button

### 3. Frog→lily pad logic end-to-end
- Frogs crossing river using log AI (see Frog AI section)
- Lily pad fill triggers correctly with visual feedback
- Lose condition (5 pads filled) fires cleanly

---

## 🟡 Should-Haves (v1 quality bar)

### 1. Sound effects
- Hop (frog jumps)
- Eat (gator eats frog)
- Die/damage (gator loses HP)
- Power-up collect
- Win / lose stings
- Placeholder bleeps acceptable for v1

### 2. Title / start screen
- Game title, controls summary
- "Press any key to start"
- Show high score if one exists

### 3. Score system (see full breakdown below)
- Points displayed live in HUD
- Final score on game over
- Breakdown visible (frogs eaten, time bonus, pad penalty, win bonus)

### 4. Log sprites
- Logs are the dominant visual — replace plain brown rectangles with pixel art
- Brown cylindrical log sprites, direction shading (darker end = direction of travel)

### 5. Visual feedback on lily pad fill
- Color change + brief flash when a frog occupies a pad
- Player needs immediate visual signal a pad was taken

### 6. Frog type system (see full breakdown below)
- 5 frog types by rarity and color
- Visual-only differentiation (color tint on frog sprite)

---

## 🟢 Nice-to-Haves (Polish)

### 1. Difficulty ramp — level-by-level
- Each level completion increases difficulty parameters
- Level N config: more logs per column, faster log speeds, faster/more frog spawns
- Clean level transition screen between rounds
- Parameters reset to level baseline on new level (not cumulative mid-level)

### 4. Local leaderboard
- Top 5 scores stored in localStorage
- Shown on title screen and game over screen
- Entries include: score, level reached, date

### 5. Background art
- Replace flat color blocks with textured bank/grass/river visuals
- Forest silhouette on left/right banks

---

## 🐸 Frog AI — Smart River Crossing

Frogs are trying to cross the river using logs as stepping stones. They prefer log-to-log hops but aren't perfect — mistakes land them in the water where the gator hunts them.

### Frog States
- `ON_BANK` — on right bank, waiting to enter river
- `ON_LOG` — riding a log, scanning for next log to jump to
- `SWIMMING` — in water (vulnerable, slow, gator food)
- `ON_PAD` — reached lily pad, scores against player

### Decision Logic (per decision tick)
1. If `ON_LOG`:
   - Scan left-adjacent column for a log overlapping current Y ± 1 tile
   - If log found: jump to it (smart move)
   - If no log: wait (stay on current log, ride it)
   - With `(1 - FROG_SMARTNESS)` probability: jump anyway → lands in water
2. If `SWIMMING`:
   - Move left slowly (half speed)
   - Scan for nearby logs to grab
   - Vulnerable to gator collision

### Tuning Constant
```js
// 0.0 = dumb (always jumps into water)
// 1.0 = perfect (never jumps into water)
export const FROG_SMARTNESS = 0.75; // start here, dial up/down per feel
```

---

## 🎯 Score System

### Points Earned
| Event | Points |
|-------|--------|
| Eat basic frog (green) | 200 |
| Eat blue frog | 500 |
| Eat purple frog | 1,000 |
| Eat red frog | 1,500 |
| Eat gold frog | 2,000 |
| Win round bonus | 1,000 |
| Time remaining bonus | 10 pts × seconds left |

### Points Lost
| Event | Points |
|-------|--------|
| Frog reaches lily pad | -300 |

### Tuning Constant
```js
export const SCORE_FROG_PAD_PENALTY = 300;
export const SCORE_WIN_BONUS = 1000;
export const SCORE_TIME_BONUS_PER_SEC = 10;
```

---

## 🐸 Frog Types

Visual differentiation via color tint on the frog sprite. Spawn rates are weighted — rarer frogs are worth more.

| Type | Color | Points | Target per game | Spawn weight |
|------|-------|--------|-----------------|--------------|
| Basic | Green | 200 | ~20+ | 60% |
| Blue | Blue | 500 | ~10 | 25% |
| Purple | Purple | 1,000 | ~5 | 10% |
| Red | Red | 1,500 | ~2 | 4% |
| Gold | Yellow/Gold | 2,000 | ~1 | 1% |

### Tuning Constant
```js
// Adjust these to dial rarity up/down
export const FROG_SPAWN_WEIGHTS = {
  basic:  60,   // green
  blue:   25,
  purple: 10,
  red:    4,
  gold:   1,
};
```

Spawn logic: roll a weighted random on each frog spawn to determine type, apply color tint to sprite.

---

## 💊 Health Power-Ups

White box with red cross, spawns randomly in the play area during the game.

### Behavior
- Spawns at a random grid position in the river or bank area (not on a log)
- Visible for 8 seconds, then despawns if not collected
- Gator collision = collect: +1 HP (capped at MAX_HP)
- Target: ~3 per game (one every ~20 seconds)

### Tuning Constants
```js
export const POWERUP_SPAWN_INTERVAL = 20000; // ms between spawns
export const POWERUP_DURATION = 8000;        // ms visible before despawn
export const POWERUP_HP_RESTORE = 1;         // HP granted on collect
export const POWERUP_COUNT_TARGET = 3;       // per 60s game
```

### Visual
- White rectangle with red cross drawn on top (no asset needed for v1)
- Brief flash/tween on collect

---

## 🎮 Gator Movement — Option B (Tween Slide)

- Grid-based movement (one tile per input)
- 80ms slide tween to destination (smooth, readable)
- Hold key to move continuously (isDown not JustDown)
- `this.moving` flag blocks new input mid-tween
- Flip sprite horizontally on left/right movement
- Collision detection stays grid-based

---

## 📈 Difficulty Ramp (Level-by-Level)

Each level completion triggers a parameter bump for the next level. No mid-level changes.

| Level | Logs/col | Log speed | Frog spawn | Notes |
|-------|----------|-----------|------------|-------|
| 1 | 2 | 20–50 px/s | 1.5–2.25s | Tutorial feel |
| 2 | 2 | 30–65 px/s | 1.25–2.0s | Slightly faster |
| 3 | 3 | 40–80 px/s | 1.0–1.75s | More logs |
| 4+ | 3+ | Scales | Scales | Cap at reasonable max |

Level transition: brief "LEVEL X" screen, then restart timer with new params.

---

## 🌐 Deployment

- Netlify deploy (one-time setup, auto-deploy from `dist/`)
- Shareable URL for mobile QA
- Required before calling v1 shipped

---

## 🔵 Phase 3 — Future Features

### New Obstacles
- **Boats** — larger, faster hazard crossing the river, different sprite
- Can damage gator on contact

### Collectibles
- **Coins** — spawn randomly in river, visible 3–5 seconds then disappear
- Gator collects for bonus score
- Risk/reward: chase coins vs defend pads

---

## 🔵 Phase 3 — Future Features

### Obstacles beyond logs
- **Boats** — larger, faster moving hazard across the river
- Different sprite, faster speed, larger hitbox

### Collectibles
- **Coins** — spawn randomly in the river, visible for 3-5 seconds then disappear
- Gator swims over to collect for bonus score
- Adds risk/reward: do you chase coins or stay defensive?

---
