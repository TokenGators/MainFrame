# GATORRR Phase 2 - Implementation Instructions for Coder Agent

Read `GATORRR_PRD_v3.md` and `LOG_LAYOUT_SPEC.md` first. They are the source of truth.

---

## Execution Order (Do These In Sequence)

### Step 1: Delete Dead Code

Delete these files — they implement a different game (classic horizontal Frogger) and are never imported:

```
rm src/entities/player.js
rm src/entities/car.js
rm src/entities/log.js
rm src/scenes/game.js
rm src/config.js
rm scenes/GameScene.js
rm config.js
rm index.html      (root-level CDN entry, NOT src/index.html)
rm main.js         (root-level CDN init, NOT src/main.js)
```

**Keep:** `src/main.js` (entry point — will be rewritten), `src/index.html` (webpack template), `webpack.config.js`, `package.json`.

---

### Step 2: Create `src/constants.js`

This file defines ALL magic numbers. Nothing hardcoded in scene code.

```javascript
// Rendering
export const CANVAS_WIDTH = 320;
export const CANVAS_HEIGHT = 180;
export const TILE = 16;
export const ZOOM = 4;

// Grid
export const GRID_COLS = CANVAS_WIDTH / TILE;   // 20
export const GRID_ROWS = CANVAS_HEIGHT / TILE;  // 11 (row 0 = HUD, rows 1-10 = play)

// Zones (in tile columns)
export const ZONE = {
  LEFT_BANK: 0,       // col 0
  LILY_PADS: 1,       // col 1
  RIVER_START: 2,     // col 2
  RIVER_END: 16,      // col 16
  RIGHT_BANK_START: 17, // cols 17-19
};

// PICO-8 Palette
export const C = {
  BLACK:      0x000000,
  DARK_BLUE:  0x1D2B53,
  DARK_RED:   0x7E2553,
  DARK_GREEN: 0x008751,
  BROWN:      0xAB5236,
  DARK_GRAY:  0x5F574F,
  LIGHT_GRAY: 0xC2C3C7,
  WHITE:      0xFFF1E8,
  RED:        0xFF004D,
  ORANGE:     0xFFA300,
  YELLOW:     0xFFEC27,
  GREEN:      0x00E436,
  BLUE:       0x29ADFF,
  LAVENDER:   0x83769C,
  PINK:       0xFF77A8,
  PEACH:      0xFFCCAA,
};

// Gameplay
export const GATOR_START = { col: 10, row: 9 };
export const MAX_HP = 3;
export const FROGS_TO_WIN = 10;
export const TOTAL_PADS = 5;
export const DAMAGE_COOLDOWN = 500; // ms
export const FROG_DECISION_INTERVAL = 500; // ms
export const FROG_JUMP_CHANCE = 0.6;
export const FROG_SPAWN_MIN = 1500; // ms
export const FROG_SPAWN_MAX = 2250; // ms
export const MAX_FROGS_MIN = 6;
export const MAX_FROGS_MAX = 8;
export const LOG_SPEED_MIN = 8;  // px/sec
export const LOG_SPEED_MAX = 20; // px/sec
export const LOG_HEIGHT_OPTIONS = [2, 3, 4]; // in tiles
export const LOG_GAP_OPTIONS = [16, 32, 48, 64]; // in px
export const LOG_WIDTH = 10; // px (within 16px column)
export const NUM_LOG_COLUMNS = 15;

// Lily pad positions (grid coords)
export const LILY_PAD_POSITIONS = [
  { col: 1, row: 2 },
  { col: 1, row: 4 },
  { col: 1, row: 5 },
  { col: 1, row: 7 },
  { col: 1, row: 9 },
];
```

---

### Step 3: Rewrite `src/main.js` (Phaser Config Only)

The entry point should ONLY contain the Phaser game config and scene imports. No game logic.

```javascript
import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ZOOM } from './constants.js';
import BootScene from './scenes/BootScene.js';
import GameScene from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';

const config = {
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  render: {
    pixelArt: true,
    antialias: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: ZOOM,
  },
  scene: [BootScene, GameScene, GameOverScene],
};

new Phaser.Game(config);
```

---

### Step 4: Create Scene Files

**`src/scenes/BootScene.js`**
- Preload sprite assets (frog.png, gator.png, lily_pad.png from `assets/`)
- Preload bitmap font if available; otherwise use Phaser's built-in bitmap text generation
- On complete, start GameScene

**`src/scenes/GameScene.js`**
This is the main gameplay scene. Port logic from the current `src/main.js` FroggerScene but:
- Use `constants.js` for ALL values (no magic numbers)
- Use `delta` from `update(time, delta)` for ALL timing
- Instantiate entity/manager classes instead of inline logic
- Gator bounds: cols 0-19, rows 1-10 (NOT clamped to river)
- Frog bounds: cols 1-17, rows 1-10 (CAN reach lily pads)

**`src/scenes/GameOverScene.js`**
- Receives game result data (win/lose, reason, stats)
- Displays outcome text using bitmap font
- Listens for R key to restart (scene.start('GameScene'))

---

### Step 5: Create Entity Classes

**`src/entities/Gator.js`**
```
- constructor(scene, col, row)
- Properties: gridCol, gridRow, hp, direction, damageCooldown
- Methods: handleInput(cursors), takeDamage(delta), getPixelPos()
- Movement: 1 tile per keypress, grid-snapped
- Bounds: cols 0-19, rows 1-10
- Graphics: 16x16 green rectangle (or sprite if loaded)
- Damage flash: tint red for 200ms on hit
```

**`src/entities/Frog.js`**
```
- constructor(scene, col, row)
- Properties: gridCol, gridRow, state, decisionTimer, onLogId, timeOnLog
- Methods: update(delta, logs), makeDecision(logs), destroy()
- States: SWIMMING, ON_LOG, VULNERABLE
- Movement: Grid-based hop (UP/DOWN/LEFT), 60/40 jump/wait
- ON_LOG: track log's Y position, DON'T grid-snap Y while riding
- Bounds: cols 1-17, rows 1-10
- Graphics: 16x16, color changes by state (Red/Orange/Pink)
```

**`src/entities/Log.js`**
```
- constructor(scene, colIndex, y, heightTiles, speed)
- Properties: x, y, width (10px), height, speed
- Methods: update(delta), isOffScreen(), wrap()
- Graphics: brown rectangle (10px wide, height varies)
- Movement: vertical (speed * delta/1000), wraps at screen edges
```

**`src/entities/LilyPad.js`**
```
- constructor(scene, col, row)
- Properties: gridCol, gridRow, filled
- Methods: fill(), getPixelPos()
- Graphics: 16x16, Dark Green when empty, Dark Red when filled
```

---

### Step 6: Create Manager Classes

**`src/managers/LogColumnManager.js`**
```
- constructor(scene)
- Creates 15 columns of logs (cols 2-16)
- Each column: alternating direction, random speed (8-20 px/sec)
- Each column filled with logs of random height (2-4 tiles) and random gaps (16-64px)
- Methods: update(delta), getAllLogs()
- Handles log wrapping (off-screen -> reappear opposite edge)
```

**`src/managers/FrogSpawner.js`**
```
- constructor(scene)
- Properties: spawnTimer, spawnInterval, frogs[]
- Methods: update(delta), spawnFrog(), removeFrog(frog)
- Spawns at col 17, random row (1-10)
- Max 6-8 frogs active
- Interval: 1500-2250ms
```

**`src/managers/CollisionSystem.js`**
```
- constructor(scene)
- Methods: checkAll(gator, frogs, logs, lilyPads, gameState)
- Gator vs Logs: damage with cooldown
- Gator vs Frogs: eat frog
- Frogs vs LilyPads: fill pad (frog.gridCol <= 1 AND near unfilled pad)
- Uses rectangle overlap (center-based, half-width/half-height)
```

---

### Step 7: Create HUD

**`src/ui/HUD.js`**
```
- constructor(scene)
- Renders at row 0 (y=0 to y=16)
- Displays: HP, Frogs Eaten, Pads Filled
- Uses bitmap text OR Phaser.GameObjects.BitmapText
- If no bitmap font available, use smallest Phaser text possible (fontSize: '8px')
  with the nearest PICO-8 color
- Colors: White default, Red for warnings (HP=1, Pads>=4)
- Methods: update(gameState)
```

---

### Step 8: Replace All Colors with Palette Constants

Every `0xNNNNNN` in the codebase must come from the `C` object in constants.js. Zero exceptions.

Examples:
- Water background: `C.DARK_BLUE` (was `0x1a1a3e`)
- Banks: `C.DARK_GREEN` (was `0x228b22`)
- Logs: `C.BROWN` (was `0x8b4513`)
- Gator: `C.GREEN` (was `0x22dd22`)
- Frog swimming: `C.RED` (was `0xff0000`)
- Frog on log: `C.ORANGE` (was `0xff6666`)
- Lily pad empty: `C.DARK_GREEN` (was `0xffcc00`)
- Lily pad filled: `C.DARK_RED` (was `0xdd0000`)
- HUD text: `C.WHITE` (was `0xffffff`)
- HUD warning: `C.RED`

---

## Critical Bugs to Fix (Explained)

### Bug 1: Frog gridX clamping prevents reaching lily pads
**Old code (src/main.js:452):**
```javascript
newGridX = Math.max(Math.ceil(80 / this.gridSize), Math.min(...));
// Math.ceil(80/32) = 3, so frogs can't go below col 3
// But lily pads are at col ~1.5 (x=48)
```
**Fix:** In new grid, clamp to `Math.max(1, ...)` so frogs can reach col 1 (lily pad zone).

### Bug 2: Gator clamped to riverBounds.left = 80
**Old code (src/main.js:289):**
```javascript
const newX = Math.max(this.riverBounds.left + this.gridSize / 2, this.gator.x - this.gridSize);
// riverBounds.left = 80, so gator can't go below x=96
// Lily pads are at x=48
```
**Fix:** Gator bounds should be cols 0-19 (full screen width), not river-only.

### Bug 3: Hardcoded `* 0.016` and `+= 16`
**Old code (src/main.js:325, 374):**
```javascript
log.y += log.speed * 0.016;     // assumes 60 FPS
frog.decisionTimer += 16;       // assumes 16ms frames
```
**Fix:** Use `delta` parameter: `log.y += log.speed * (delta / 1000)` and `frog.decisionTimer += delta`.

### Bug 4: Grid snap overwrites log riding
**Old code (src/main.js:388-411):**
```javascript
// Line 388: frog.y = log.y;  (correct - track log)
// Line 410: frog.y = frog.gridY * this.gridSize;  (OVERWRITES log.y!)
```
**Fix:** In Frog.update(), skip Y grid-snap when state === 'ON_LOG'. Update gridY FROM the log's position instead.

---

## Validation Checklist (Run After Implementation)

1. Open game in browser at 1280x720 (or scaled to fit)
2. Verify pixels are crisp (zoom in — should see hard edges, no blur)
3. Move gator LEFT past the river into lily pad zone (col 1) — should work
4. Watch frogs hop LEFT — they should eventually reach lily pads and fill them
5. Watch a frog ride a log — it should visually move up/down with the log
6. Get hit by a log — HP should decrease by 1, not spam
7. Eat 10 frogs — WIN screen should appear
8. Let 5 pads fill — LOSE screen should appear
9. Press R to restart — game should reset
10. Check console — no errors

---

## What NOT To Do

- Do NOT keep any 800x600 references
- Do NOT use `0.016` or `+= 16` anywhere — always use `delta`
- Do NOT use Arial or any system font
- Do NOT use sprite sizes other than 16x16 (or multiples thereof for logs)
- Do NOT use colors outside the PICO-8 palette
- Do NOT clamp gator movement to river bounds only
- Do NOT clamp frog movement to river bounds only
- Do NOT grid-snap frog Y position while in ON_LOG state
- Do NOT import or reference the deleted dead code files
