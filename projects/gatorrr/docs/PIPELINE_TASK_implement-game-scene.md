# Pipeline Task: Implement GameScene

**Task slug:** `implement-game-scene`  
**Project:** `gatorrr`  
**Priority:** 🔴 Blocker — game does not run without this  
**Skip architect:** `true` — spec is complete below  

---

## Context

All entity classes, managers, and scenes have been scaffolded. The game builds and the
devServer starts cleanly on port 8081. However `GameScene.create()` and
`GameScene.update()` are empty stubs — nothing is ever instantiated and the game
renders a blank canvas.

This task wires everything together inside GameScene and adds the one missing asset.

---

## Codebase Map

```
projects/gatorrr/
├── src/
│   ├── constants.js              ← All config values (TILE=16, ZOOM=4, ZONES, etc.)
│   ├── main.js                   ← Phaser config, registers BootScene/GameScene/GameOverScene
│   ├── entities/
│   │   ├── Gator.js              ← Phaser.GameObjects.Rectangle, grid movement, HP, damage
│   │   ├── Frog.js               ← Rectangle, state machine (SWIMMING/ON_LOG/VULNERABLE)
│   │   ├── Log.js                ← Rectangle, vertical movement, screen wrapping
│   │   └── LilyPad.js            ← Rectangle, fill() changes color, tracks filled state
│   ├── managers/
│   │   ├── CollisionSystem.js    ← checkAll(gator, frogs, logs, lilyPads, gameState)
│   │   ├── FrogSpawner.js        ← update(delta) spawns/manages frogs, exposes this.frogs
│   │   └── LogColumnManager.js   ← update(delta) moves logs, exposes getAllLogs()
│   ├── scenes/
│   │   ├── BootScene.js          ← preload() loads frog/gator/lily_pad images → GameScene
│   │   ├── GameScene.js          ← ⚠️ create() and update() are EMPTY — implement these
│   │   └── GameOverScene.js      ← init(data), renders win/lose, R key restarts GameScene
│   └── ui/
│       └── HUD.js                ← constructor(scene), update(gameState) — ready to use
└── public/
    └── assets/
        ├── frog.png              ← exists ✅
        ├── gator.png             ← exists ✅
        └── lily_pad.png          ← MISSING ❌ — create a 16×16 green square placeholder PNG
```

---

## Task 1 — Create missing `lily_pad.png` asset

BootScene tries to load `assets/lily_pad.png`. It doesn't exist, causing a console error.

Create a **16×16 green placeholder PNG** at `public/assets/lily_pad.png`.

Use any method available: Node.js Canvas, sharp, ImageMagick (`convert`), or write raw PNG bytes.
The placeholder just needs to be a valid PNG — color `#008751` (dark green) fills fine.

Quick Node.js one-liner if available:
```bash
node -e "
const {createCanvas} = require('canvas');
const fs = require('fs');
const c = createCanvas(16,16);
const ctx = c.getContext('2d');
ctx.fillStyle = '#008751';
ctx.fillRect(0,0,16,16);
fs.writeFileSync('public/assets/lily_pad.png', c.toBuffer());
"
```

Or with ImageMagick:
```bash
convert -size 16x16 xc:#008751 public/assets/lily_pad.png
```

---

## Task 2 — Implement `GameScene.create()`

Replace the empty `create()` method with the full implementation below.

### Full `GameScene.js` implementation

```javascript
import Phaser from 'phaser';
import { C, CANVAS_WIDTH, CANVAS_HEIGHT, TILE, ZONE, GATOR_START, LILY_PAD_POSITIONS } from '../constants.js';
import Gator from '../entities/Gator.js';
import LilyPad from '../entities/LilyPad.js';
import LogColumnManager from '../managers/LogColumnManager.js';
import FrogSpawner from '../managers/FrogSpawner.js';
import CollisionSystem from '../managers/CollisionSystem.js';
import HUD from '../ui/HUD.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene', physics: { arcade: { debug: false } } });
  }

  init() {
    this.gameState = {
      hp: 3,
      frogsEaten: 0,
      padsFilled: 0,
      gameOver: false,
      win: false,
    };
  }

  create() {
    // ── Background ──────────────────────────────────────────────────────
    // Left bank (cols 0)
    this.add.rectangle(0, 0, ZONE.RIVER_START * TILE, CANVAS_HEIGHT, C.DARK_GREEN).setOrigin(0);
    // River (cols 2–16)
    this.add.rectangle(
      ZONE.RIVER_START * TILE, 0,
      (ZONE.RIGHT_BANK_START - ZONE.RIVER_START) * TILE, CANVAS_HEIGHT,
      C.DARK_BLUE
    ).setOrigin(0);
    // Right bank (cols 17–19)
    this.add.rectangle(ZONE.RIGHT_BANK_START * TILE, 0, 3 * TILE, CANVAS_HEIGHT, C.DARK_GREEN).setOrigin(0);

    // ── Lily Pads ────────────────────────────────────────────────────────
    this.lilyPads = LILY_PAD_POSITIONS.map(({ col, row }) => new LilyPad(this, col, row));

    // ── Logs ─────────────────────────────────────────────────────────────
    this.logManager = new LogColumnManager(this);

    // ── Gator ────────────────────────────────────────────────────────────
    this.gator = new Gator(this, GATOR_START.col, GATOR_START.row);

    // ── Frogs ────────────────────────────────────────────────────────────
    this.frogSpawner = new FrogSpawner(this);

    // ── Collision system ─────────────────────────────────────────────────
    this.collisionSystem = new CollisionSystem(this);

    // ── HUD ──────────────────────────────────────────────────────────────
    this.hud = new HUD(this);

    // ── Input ────────────────────────────────────────────────────────────
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up:    Phaser.Input.Keyboard.KeyCodes.W,
      down:  Phaser.Input.Keyboard.KeyCodes.S,
      left:  Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // Merge WASD into cursors-style object for Gator.handleInput
    this.inputKeys = {
      left:  { isDown: () => this.cursors.left.isDown  || this.wasd.left.isDown  },
      right: { isDown: () => this.cursors.right.isDown || this.wasd.right.isDown },
      up:    { isDown: () => this.cursors.up.isDown    || this.wasd.up.isDown    },
      down:  { isDown: () => this.cursors.down.isDown  || this.wasd.down.isDown  },
    };
  }

  update(time, delta) {
    if (this.gameState.gameOver) {
      this.scene.start('GameOverScene', {
        result: this.gameState.win ? 'win' : 'lose',
        reason: this.gameState.win ? '' : (this.gameState.padsFilled >= 5 ? 'pads' : 'hp'),
        stats: {
          frogsEaten: this.gameState.frogsEaten,
          padsFilled: this.gameState.padsFilled,
        },
      });
      return;
    }

    // Update entities
    this.gator.update(delta);
    this.gator.handleInput(this.inputKeys);
    this.logManager.update(delta);
    this.frogSpawner.update(delta);

    // Sync HP from gator to gameState
    this.gameState.hp = this.gator.hp;
    if (this.gator.hp <= 0) {
      this.gameState.gameOver = true;
    }

    // Collision checks
    this.collisionSystem.checkAll(
      this.gator,
      this.frogSpawner.frogs,
      this.logManager.getAllLogs(),
      this.lilyPads,
      this.gameState
    );

    // HUD
    this.hud.update(this.gameState);
  }
}
```

---

## Task 3 — Fix `Gator.handleInput()` signature

`Gator.handleInput(cursors)` uses `cursors.left.isDown` (boolean property).
The merged `inputKeys` above uses `isDown()` (function). Update `handleInput` in `Gator.js`
to support both, or change it to call `isDown()` as a function:

```javascript
handleInput(keys) {
  const left  = typeof keys.left.isDown  === 'function' ? keys.left.isDown()  : keys.left.isDown;
  const right = typeof keys.right.isDown === 'function' ? keys.right.isDown() : keys.right.isDown;
  const up    = typeof keys.up.isDown    === 'function' ? keys.up.isDown()    : keys.up.isDown;
  const down  = typeof keys.down.isDown  === 'function' ? keys.down.isDown()  : keys.down.isDown;

  if (left  && this.gridCol > 0)  { this.gridCol--; }
  else if (right && this.gridCol < 19) { this.gridCol++; }
  else if (up    && this.gridRow > 0)  { this.gridRow--; }
  else if (down  && this.gridRow < 10) { this.gridRow++; }

  this.x = this.gridCol * 16 + 8;
  this.y = this.gridRow * 16 + 8;
}
```

---

## Task 4 — Verify locally

After implementing, run:
```bash
cd projects/gatorrr && npm start
```

Then open `http://swampmini.lan:8081` and verify:

- [ ] Game canvas renders (not blank)
- [ ] River (blue), banks (green), lily pads (dark green) visible
- [ ] Gator (green rectangle) visible and moves with arrow keys / WASD
- [ ] Logs (brown rectangles) moving vertically in columns
- [ ] Frogs (red rectangles) spawning from right side and moving left
- [ ] Gator takes damage from logs (HP decreases)
- [ ] Gator eats frogs on collision (frogs counter increases)
- [ ] Frogs fill lily pads when reaching left edge
- [ ] HUD shows HP / Frogs / Pads at top
- [ ] Game over screen appears when HP = 0 or pads = 5
- [ ] Win screen appears when 10 frogs eaten
- [ ] R key restarts game

---

## Git Workflow

```
branch: agent/gatorrr/implement-game-scene

./scripts/git-workflow.sh start gatorrr implement-game-scene
# ... make changes ...
./scripts/git-workflow.sh save feat gatorrr "implement GameScene and wire up full game loop"
./scripts/git-workflow.sh submit gatorrr implement-game-scene "Implement GameScene — wire entities, managers, input, collision"
gh pr create --base dev --title "feat[gatorrr]: Implement GameScene — wire full game loop" \
  --body "GameScene.create() and update() were empty stubs. This wires up all entities and managers so the game actually runs. Also adds missing lily_pad.png placeholder."
```

---

## Success Criteria

Game is playable end-to-end at `http://swampmini.lan:8081` with no console errors.
All checklist items in Task 4 pass.
