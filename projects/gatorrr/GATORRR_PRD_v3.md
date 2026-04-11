# GATORRR - Product Requirements Document v3.0

**Game Title:** TokenGators Gator Frogger ("GATORRR")
**Platform:** Web (Phaser.js)
**Genre:** Tower Defense + Frogger Hybrid
**Status:** Phase 2 - Retro Rendering Overhaul + Bug Fixes
**Target Release:** End of Phase 2 (v3.0 with retro pipeline + assets)

---

## 1. Game Overview

**Core Concept:**
You are a gator defending your home lily pads from an invasion of frogs. The frogs hop across logs floating in the river trying to reach your side. Your job: **eat the frogs before they overwhelm your lily pads**.

**Win Condition:** Eat 10 frogs
**Lose Conditions:**
- All 3 HP depleted (hit by logs)
- All 5 lily pads filled by frogs

---

## 2. Retro Rendering Philosophy (NEW - FOUNDATIONAL)

> "Retro style is not just about visible pixels. It is also about reduced visual information."

GATORRR follows authentic retro rendering constraints. The retro look comes from choosing a limited technical language and sticking to it throughout — not from sprinkling effects on top of high-resolution art.

### The Golden Rule
**Low-res first. Clean whole-number nearest-neighbor upscale after.**

### Rendering Pipeline

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Internal resolution | **320x180** | True low-res 16:9 canvas |
| Tile size | **16x16 px** | Power of two, every pixel matters |
| Grid dimensions | **20x11.25** (20 cols x 11 rows usable) | Clean tile coverage |
| Upscale method | **Nearest-neighbor only** | Hard pixel edges, no blur |
| Upscale factor | **4x** | Whole-number only (NON-NEGOTIABLE) |
| Display resolution | **1280x720** | 320x180 x 4 |
| Color palette | **16 colors (PICO-8)** | Reduced palette sells the era |
| Font | **Bitmap pixel font** | No system fonts (Arial, etc.) |
| Sprite sizes | **16x16 px** (powers of two) | Grid-aligned, consistent |

### Phaser Configuration
```javascript
const config = {
  type: Phaser.AUTO,
  width: 320,          // TRUE internal resolution
  height: 180,         // TRUE internal resolution
  render: {
    pixelArt: true,
    antialias: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: 4,           // Whole-number upscale (4x)
  },
  scene: [BootScene, GameScene, GameOverScene],
};
```

### PICO-8 Color Palette (16 Colors)
All game visuals MUST use only these colors:

| Index | Hex | Name | Usage |
|-------|-----|------|-------|
| 0 | `0x000000` | Black | Background accents, outlines |
| 1 | `0x1D2B53` | Dark Blue | Deep water |
| 2 | `0x7E2553` | Dark Red | Filled lily pad, damage flash |
| 3 | `0x008751` | Dark Green | Banks, lily pads (empty) |
| 4 | `0xAB5236` | Brown | Logs |
| 5 | `0x5F574F` | Dark Gray | UI background bar |
| 6 | `0xC2C3C7` | Light Gray | UI text (secondary) |
| 7 | `0xFFF1E8` | White | UI text (primary), highlights |
| 8 | `0xFF004D` | Red | Frogs (swimming state) |
| 9 | `0xFFA300` | Orange | Frogs (on log), warnings |
| 10 | `0xFFEC27` | Yellow | Lily pads (empty glow) |
| 11 | `0x00E436` | Green | Gator |
| 12 | `0x29ADFF` | Blue | Water surface |
| 13 | `0x83769C` | Lavender | Reserved |
| 14 | `0xFF77A8` | Pink | HP low warning |
| 15 | `0xFFCCAA` | Peach | Reserved |

### Retro Consistency Rules
1. **ALL entities render on the 320x180 canvas** — no mixing resolutions
2. **No system fonts** — bitmap pixel fonts only (e.g., 5x7 or Press Start 2P)
3. **No smooth gradients** — banding/posterization is a feature, not a bug
4. **No fractional scaling** — sprites are 16x16, never 24x24 or arbitrary sizes
5. **Rotation is dangerous** — avoid rotating pixel art (breaks grid alignment)
6. **16 colors max** — the palette above, no exceptions

---

## 3. Game World & Layout (UPDATED FOR 320x180)

### Screen Layout (16px Grid on 320x180 Canvas)
```
Col:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19
      |LB|LP|     RIVER (15 columns of logs)              |RB|RB|
Row 0 [==][==][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][  ][==][==][==]  <- HUD row
Row 1 [GB][ P][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][RB][RB][RB]
Row 2 [GB][ P][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][RB][RB][RB]
...
Row 10[GB][ P][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][ L][RB][RB][RB]

LB = Left Bank (col 0)
LP = Lily Pad knockout zone (col 1)
L  = Log columns (cols 2-16, 15 columns)
RB = Right Bank / Frog Spawn (cols 17-19)
```

### Zone Definitions (in 16px tiles)
| Zone | X Range (tiles) | X Range (px) | Width |
|------|----------------|--------------|-------|
| Left Bank | col 0 | 0-16 | 16px (1 tile) |
| Lily Pad Knockouts | col 1 | 16-32 | 16px (1 tile) |
| River (logs) | cols 2-16 | 32-272 | 240px (15 tiles) |
| Right Bank (spawn) | cols 17-19 | 272-320 | 48px (3 tiles) |

### Vertical Layout
| Zone | Row Range | Y Range (px) | Purpose |
|------|-----------|--------------|---------|
| HUD | row 0 | 0-16 | HP, Frogs, Pads display |
| Play Area | rows 1-10 | 16-176 | Active gameplay |
| Bottom | row 10 | 160-176 | Gator start zone |

---

## 4. Lily Pads (UPDATED FOR 16px GRID)

### Location & Layout
Lily pads are positioned in **knockouts** at **col 1** (x=16-32), creating safe landing spots adjacent to the leftmost log column.

### Positions (5 pads)
| Pad | Grid Position | Pixel Position (center) |
|-----|--------------|------------------------|
| Pad 1 | (1, 2) | x=24, y=40 |
| Pad 2 | (1, 4) | x=24, y=72 |
| Pad 3 | (1, 5) | x=24, y=88 |
| Pad 4 | (1, 7) | x=24, y=120 |
| Pad 5 | (1, 9) | x=24, y=152 |

*Note: Pads are spaced with gaps so gator can navigate between them.*

### Gameplay
- Frogs hop from leftmost log (col 2) to lily pad (col 1)
- Gator can move to col 1 to intercept frogs
- Gator's movement bounds now include col 1 (NOT clamped to river only)
- Each pad: 16x16 sprite, states: Empty (dark green) / Filled (dark red)

---

## 5. Frogs

### Spawn Behavior
- **Spawn location:** Right bank, col 17 (x=272+8=280), random row
- **Frequency:** 1.5-2.25 second intervals (25% increase from original)
- **Max active:** 6-8 frogs at once
- **Grid alignment:** Always snapped to 16px grid

### Frog State Machine
```
SWIMMING -> [detect log] -> ON_LOG -> [ride 1-2s] -> SWIMMING
   |                                                    |
   +-- [wait > 2s in water] -> VULNERABLE -> [gator eats] -> DESPAWN
                                    |
                            [log arrives] -> ON_LOG
```

### Movement (Grid-Based Hopping)
- **Decision interval:** 500ms (0.5 seconds)
- **Jump probability:** 60% jump, 40% wait
- **Directions:** UP, DOWN, LEFT only (never RIGHT)
- **Movement unit:** 1 tile = 16px per hop
- **Grid clamped:** Frogs stay within cols 1-17, rows 1-10

### Sprite
- **Size:** 16x16 px
- **Color by state:**
  - SWIMMING: Red (`0xFF004D`)
  - ON_LOG: Orange (`0xFFA300`)
  - VULNERABLE: Pink flash (`0xFF77A8`)

---

## 6. Gator (Player)

### Controls
- **Arrow Keys:** Up, Down, Left, Right
- **Movement:** 16px per keypress (1 tile, grid-based)
- **Bounds:** cols 0-19, rows 1-10 (full play area INCLUDING lily pad zone)

**CRITICAL FIX:** Gator movement MUST NOT be clamped to river bounds only. The gator needs to reach lily pads (col 1) to intercept frogs. Previous code clamped `riverBounds.left = 80`, making lily pads unreachable.

### Health System
- **HP:** 3 (start with 3/3)
- **Damage:** -1 HP per log collision
- **Cooldown:** 500ms between damage hits
- **Death:** HP = 0 -> Game Over

### Eating Frogs
- Gator + Frog overlap = eat frog
- +1 to "Frogs Eaten" counter
- Frog despawns
- Win at 10 frogs eaten

### Sprite
- **Size:** 16x16 px
- **Color:** Green (`0x00E436`)
- **Damaged state:** Flash red (`0xFF004D`) on hit
- **Start position:** col 10, row 9 (center-bottom of river)

---

## 7. Logs (Obstacles) (RECONCILED)

### Agreed Specification
| Parameter | Value | Notes |
|-----------|-------|-------|
| Column count | **15** | Matches LOG_LAYOUT_SPEC (cols 2-16 on grid) |
| Column width | **16px** (1 tile) | Replaces old 32px columns |
| Log width | **10px** | Narrow within the 16px column |
| Log height | **2-4 tiles** (32-64px) | Reduced from 2-6 to fit 320x180 |
| Direction | Alternating UP/DOWN per column | Odd cols up, even cols down |
| Speed | **8-20 px/sec** | Scaled down for 320x180 (was 80-150 at 800x600) |
| Vertical gaps | **16, 32, 48, 64px** (1-4 tiles) | Randomized per log |
| Logs per column | 3-5 (continuous wrapping) | Fills vertical space |
| Log color | Brown (`0xAB5236`) | From PICO-8 palette |

### Collision with Gator
- Rectangle overlap detection
- Gator touching log = -1 HP (with 500ms cooldown)
- Gator stays in place (no position reset)

### Safe Passage
- Variable gaps ensure at least one navigable path
- Smaller logs (2 tiles) create easier passages
- Larger logs (4 tiles) create wider obstacles

---

## 8. HUD (Heads-Up Display)

### Layout (Row 0, 16px tall)
```
HP:3/3   Frogs:0/10   Pads:0/5
```

### Requirements
- **Font:** Bitmap pixel font (NOT Arial, NOT system font)
- **Colors:** White (`0xFFF1E8`) default, Red (`0xFF004D`) for warnings
- **Position:** Row 0 (y=0 to y=16), overlaid on play area top
- **HP turns red at 1 HP remaining**
- **Pads turns red at 4+ filled**

---

## 9. Game States & Flow

### PLAYING
- All entities moving/spawning
- Collision detection active
- HUD updates in real-time
- Delta time from Phaser's `update(time, delta)` used for ALL timing

### GAME OVER (HP Lost)
```
GAME OVER
Lost all HP
Frogs: X/10
Press R to Restart
```

### GAME OVER (Pads Full)
```
GAME OVER
Pads overrun!
Frogs: X/10
Press R to Restart
```

### WIN
```
YOU WIN!
Ate 10 Frogs!
Press R to Play Again
```

---

## 10. Code Architecture (UPDATED)

### File Structure
```
projects/gatorrr/
├── src/
│   ├── main.js                -> Phaser config (320x180, 4x zoom, scene list)
│   ├── constants.js           -> PICO-8 palette, tile size, grid dims, speeds
│   ├── scenes/
│   │   ├── BootScene.js       -> Load sprite sheets, bitmap fonts
│   │   ├── GameScene.js       -> Main gameplay (delegates to managers)
│   │   └── GameOverScene.js   -> End screen (win/lose, restart)
│   ├── entities/
│   │   ├── Gator.js           -> 16x16 sprite, grid movement, HP, direction
│   │   ├── Frog.js            -> 16x16 sprite, AI state machine, grid movement
│   │   ├── Log.js             -> 10px wide rect, variable height, vertical movement
│   │   └── LilyPad.js         -> 16x16 sprite, filled/empty state
│   ├── managers/
│   │   ├── LogColumnManager.js -> Generates and updates all 15 log columns
│   │   ├── FrogSpawner.js      -> Spawn timing, max count, frog lifecycle
│   │   └── CollisionSystem.js  -> All overlap checks
│   └── ui/
│       └── HUD.js             -> Bitmap text, palette-constrained colors
├── public/
│   ├── index.html
│   └── assets/
│       ├── sprites/           -> 16x16 sprite sheets
│       │   ├── gator.png
│       │   ├── frog.png
│       │   └── lily_pad.png
│       └── fonts/             -> Bitmap font files
├── webpack.config.js
└── package.json
```

### Dead Code to Remove
The following files implement a **different game** (classic horizontal Frogger with cars, score, lives) and are never imported by the webpack entry point:
- `src/entities/player.js` - Classic Frogger player (has Car/Log references)
- `src/entities/car.js` - Car obstacles + CarManager (not in GATORRR)
- `src/entities/log.js` - Horizontal log manager (GATORRR uses vertical logs)
- `src/scenes/game.js` - Classic GameScene (different from FroggerScene)
- `src/config.js` - Old 800x600 config with car/log lane definitions
- `scenes/GameScene.js` - Root-level scene (CDN version, not webpack)
- `config.js` - Root-level 480x480 config (CDN version)
- `index.html` - Root-level CDN entry point
- `main.js` - Root-level CDN init script

**Keep:** `src/main.js` (current entry point, will be rewritten)

---

## 11. Critical Bug Fixes (MUST FIX)

### Bug 1: Frogs Can't Reach Lily Pads
**File:** `src/main.js:452`
**Problem:** `makeFrogDecision()` clamps `gridX` to river bounds (`Math.ceil(80/32)` = 3 minimum). Lily pads are at x=48 (grid col ~1.5). Frogs can never move left of col 3, so they never reach lily pads. The lose condition (all pads filled) can never trigger.
**Fix:** In new 320x180 grid, frog movement must allow cols 1-17 (lily pad zone through right bank).

### Bug 2: Gator Can't Reach Lily Pads
**File:** `src/main.js:289`
**Problem:** `riverBounds.left = 80` clamps gator's leftward movement to x=96. Lily pads are at x=48. Gator can never reach lily pads to intercept frogs. The core defend-the-pads mechanic is broken.
**Fix:** Gator bounds must encompass the full play area (cols 0-19), not just the river.

### Bug 3: Hardcoded Delta Time
**Files:** `src/main.js:325` and `src/main.js:374`
**Problem:** `log.speed * 0.016` and `frog.decisionTimer += 16` assume exactly 60 FPS. On any other frame rate, logs move at wrong speed and frog AI ticks at wrong rate.
**Fix:** Use the `delta` parameter that Phaser already passes to `update(time, delta)`.

### Bug 4: Grid Snap Overwrites Log Riding
**File:** `src/main.js:410-411`
**Problem:** Lines `frog.x = frog.gridX * this.gridSize` and `frog.y = frog.gridY * this.gridSize` execute AFTER the ON_LOG state sets `frog.y = log.y`. The grid snap immediately overwrites the log's Y position, so frogs never visually ride logs.
**Fix:** Skip grid-snap for frogs in ON_LOG state, or update gridY from log position.

---

## 12. Development Phases (UPDATED)

### Phase 1 (COMPLETE)
- Basic gameplay loop with placeholder colored shapes at 800x600
- Functional but not visually authentic

### Phase 2 (CURRENT - v3.0)
**Focus:** Retro rendering pipeline + bug fixes + modular architecture

**Step 1: Foundation (Retro Rendering Pipeline)**
1. Set up 320x180 canvas with 4x nearest-neighbor zoom
2. Create `constants.js` with PICO-8 palette, 16px tile size, grid dimensions
3. Delete all dead code (see Section 10)

**Step 2: Bug Fixes**
4. Fix gator movement bounds (allow full play area including lily pads)
5. Fix frog movement bounds (allow reaching lily pad zone)
6. Replace all hardcoded delta time with Phaser's `delta` parameter
7. Fix grid-snap overwriting log riding state

**Step 3: Modular Architecture**
8. Create `BootScene.js` for asset loading
9. Break monolithic `FroggerScene` into separate entity classes (Gator, Frog, Log, LilyPad)
10. Create manager classes (LogColumnManager, FrogSpawner, CollisionSystem)
11. Create `HUD.js` for UI rendering
12. Create `GameOverScene.js` for end states

**Step 4: Visual Polish**
13. Replace all arbitrary hex colors with PICO-8 palette constants
14. Replace Arial text with bitmap pixel font
15. Load and integrate sprite assets (16x16)
16. Reconcile log column count (15), speeds (8-20 px/sec), gaps (16-64px)

**Step 5: Validation**
17. Test all win/lose conditions end-to-end
18. Verify retro consistency (no mixed resolutions, no system fonts, no smooth gradients)
19. Build and run locally

### Phase 3 (FUTURE)
- CRT shader (scanlines, curvature, bloom) - optional retro polish
- Audio (hop, eat, die, music)
- Sprite animations (2-3 frames per entity, hand-edited)
- Difficulty scaling (waves/levels)
- Mobile touch controls

---

## 13. Testing Checklist (Phase 2 v3.0)

### Retro Rendering (NEW - TOP PRIORITY)
- [ ] Game renders at 320x180 internal resolution
- [ ] Upscaled 4x to 1280x720 via nearest-neighbor
- [ ] All pixels are crisp, hard-edged (no blur/smoothing)
- [ ] All entities use 16x16 tile grid
- [ ] Only PICO-8 palette colors visible in game
- [ ] No system fonts rendered (bitmap font only)
- [ ] No smooth gradients or anti-aliased edges

### Bug Fixes
- [ ] Gator can reach lily pad zone (col 1)
- [ ] Frogs can reach lily pad zone (col 1)
- [ ] Log movement uses delta time (not hardcoded 0.016)
- [ ] Frog decision timer uses delta time (not hardcoded 16)
- [ ] Frogs visually ride logs (y position tracks log)
- [ ] Win condition (eat 10 frogs) triggers correctly
- [ ] Lose condition (HP = 0) triggers correctly
- [ ] Lose condition (5 pads filled) triggers correctly

### Gameplay
- [ ] Gator moves in 4 directions, 16px per keypress
- [ ] Gator takes damage from log collision (HP -1)
- [ ] Damage cooldown prevents multi-hit (500ms)
- [ ] Gator eats frogs on overlap
- [ ] Frogs spawn from right bank every 1.5-2.25s
- [ ] Frogs hop in grid (UP/DOWN/LEFT only)
- [ ] Frogs ride logs vertically
- [ ] Frogs fill lily pads when reaching col 1
- [ ] 15 log columns moving alternating UP/DOWN
- [ ] Restart works (R key)

### Architecture
- [ ] No dead code files remain (player.js, car.js, old config.js, etc.)
- [ ] Entities are separate classes (Gator, Frog, Log, LilyPad)
- [ ] Managers handle spawning/updates (LogColumnManager, FrogSpawner)
- [ ] HUD is separate from game scene
- [ ] All constants in constants.js (no magic numbers in scene code)

### Performance
- [ ] 60 FPS on standard devices
- [ ] No lag with 6-8 active frogs
- [ ] No memory leaks (frogs properly destroyed on eat/despawn)

---

## 14. Success Criteria (Phase 2 v3.0)

**Game is "ready" when:**
- All retro rendering constraints are met (320x180, 4x, PICO-8 palette, pixel font)
- All 4 critical bugs are fixed
- Dead code is removed
- Modular architecture is in place
- All win/lose conditions work end-to-end
- Game plays smoothly at 60 FPS
- No console errors
- Built and runs locally via webpack

---

## 15. Technical Notes

### Delta Time (CRITICAL)
```javascript
// WRONG (assumes 60 FPS):
log.y += log.speed * 0.016;
frog.decisionTimer += 16;

// CORRECT (frame-rate independent):
log.y += log.speed * (delta / 1000);
frog.decisionTimer += delta;
```

### Coordinate System (320x180, 16px tiles)
```javascript
// Grid to pixel (center of tile):
pixelX = gridCol * 16 + 8;
pixelY = gridRow * 16 + 8;

// Pixel to grid:
gridCol = Math.floor(pixelX / 16);
gridRow = Math.floor(pixelY / 16);
```

### Lily Pad Collision (Fixed)
```javascript
// Frog reaches lily pad when gridCol <= 1 (lily pad zone)
// NOT when x < 100 (old broken check)
if (frog.gridCol <= 1) {
  // Find nearest unfilled pad
  const pad = this.lilyPads.find(p => !p.filled && Math.abs(p.gridRow - frog.gridRow) <= 1);
  if (pad) {
    pad.filled = true;
    this.gameState.padsFilled++;
    frog.destroy();
  }
}
```

---

## 16. Reconciliation Notes

Values that differed between PRD v2.0, LOG_LAYOUT_SPEC.md, and code — now resolved:

| Parameter | PRD v2 | LOG_LAYOUT_SPEC | Old Code | **v3 (Final)** |
|-----------|--------|-----------------|----------|----------------|
| Canvas size | 800x600 | 800x600 | 800x600 | **320x180** |
| Tile size | 32px | 32px | 32px | **16px** |
| Log columns | 12 | 15 | 15 | **15** |
| Log width | 80px | 20px | 20px | **10px** |
| Log height range | — | 2-6 units | 2-4 units | **2-4 tiles (32-64px)** |
| Log speed | 80-150 px/sec | — | 16-30 px/sec | **8-20 px/sec** |
| Vertical gaps | — | 0-192px | 96-256px | **16-64px (1-4 tiles)** |
| Max frogs | 5-6 | 6-10 | 6-10 | **6-8** |
| Frog size | 24x24 / 32x32 | 24x24 | 24x24 | **16x16** |
| Gator size | 32x32 | — | 32x32 | **16x16** |
| Lily pad X | x=48 | x=40 | x=48 | **col 1 (x=24 center)** |
| Spawn X | x=760 | x=560 | x=576 | **col 17 (x=280 center)** |
| Font | Arial 20px | — | Arial 20px | **Bitmap pixel font** |

---

**Document Version:** 3.0
**Last Updated:** 2026-03-11
**Author:** Review Agent
**Status:** Ready for Implementation
