# GATORRR — Cycle A Engineering Plan
**Cycle:** A — Foundation Stability  
**Reference:** CYCLE_A_FEATURE_SPEC.md  
**Branch:** agent/gatorrr/fix-crash-and-phase2  
**Status:** Awaiting approval  
**Last updated:** 2026-03-23

---

## Overview

This document provides step-by-step implementation instructions for Cycle A. Read CYCLE_A_FEATURE_SPEC.md first to understand what is being built. This document covers how to build it.

Each section includes: files to modify, exact changes required, and verification steps.

---

## Prerequisites

Before starting:
1. Confirm you are on branch `agent/gatorrr/fix-crash-and-phase2`
2. Confirm the build currently passes: `cd /Users/operator/repos/MainFrame/projects/gatorrr && npm run build`
3. If build fails, stop and report the error before proceeding

---

## A1 — Smooth Gator Movement

### Files to modify
- `src/entities/Gator.js`
- `src/constants.js` (remove moveCooldown constant if present)

### Implementation

**src/entities/Gator.js** — complete rewrite of movement system:

```js
import Phaser from 'phaser';
import { GATOR_START, TILE } from '../constants.js';

export default class Gator extends Phaser.GameObjects.Sprite {
  constructor(scene, col, row) {
    super(scene, col * TILE, row * TILE, 'gator');

    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;
    this.hp = 3;
    this.damageCooldown = 0;
    this.moving = false; // true while tween is active

    this.setOrigin(0);
    this.setDisplaySize(TILE, TILE);
    this.setDepth(2);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.setSize(TILE, TILE);
  }

  handleInput(cursors) {
    if (this.moving) return; // block input mid-slide

    let targetCol = this.gridCol;
    let targetRow = this.gridRow;
    let flip = null;

    if (cursors.left.isDown && this.gridCol > 0) {
      targetCol--;
      flip = true;
    } else if (cursors.right.isDown && this.gridCol < 19) {
      targetCol++;
      flip = false;
    } else if (cursors.up.isDown && this.gridRow > 0) {
      targetRow--;
    } else if (cursors.down.isDown && this.gridRow < 10) {
      targetRow++;
    } else {
      return; // no input
    }

    this.gridCol = targetCol;
    this.gridRow = targetRow;
    if (flip !== null) this.setFlipX(flip);
    this.moving = true;

    this.scene.tweens.add({
      targets: this,
      x: this.gridCol * TILE,
      y: this.gridRow * TILE,
      duration: 80,
      ease: 'Linear',
      onUpdate: () => {
        if (this.body) this.body.reset(this.x, this.y);
      },
      onComplete: () => {
        this.moving = false;
      }
    });
  }

  takeDamage() {
    if (this.damageCooldown <= 0) {
      this.hp--;
      this.damageCooldown = 500;
      this.setTint(0xFF004D);
      this.scene.time.delayedCall(200, () => { this.clearTint(); });
    }
  }

  update(delta) {
    if (this.damageCooldown > 0) this.damageCooldown -= delta;
  }
}
```

### Verification — A1
- [ ] Hold left arrow: gator slides left continuously, one tile per 80ms
- [ ] Hold right arrow: gator slides right, sprite faces right
- [ ] Hold left arrow: sprite flips to face left
- [ ] Up/down movement: no sprite flip
- [ ] Rapid key mashing: gator never skips tiles or moves diagonally
- [ ] Gator stops at grid boundaries (col 0, col 19, row 0, row 10)

---

## A2 — Log Balance

### Files to modify
- `src/constants.js`
- `src/managers/LogColumnManager.js`

### Implementation

**src/constants.js** — update log constants:
```js
export const LOG_GAP_OPTIONS = [48, 64, 80, 96, 112]; // px — wider gaps
export const NUM_LOG_COLUMNS = 15; // covers cols 2–16 (full river)
// LOG_HEIGHT_OPTIONS stays [2, 3]
// LOG_WIDTH stays 20
// LOG_SPEED_MIN/MAX stays 20/50
```

**src/managers/LogColumnManager.js** — fix column range and spacing:

```js
import { LOG_SPEED_MIN, LOG_SPEED_MAX, LOG_HEIGHT_OPTIONS, NUM_LOG_COLUMNS, CANVAS_HEIGHT, TILE } from '../constants.js';
import Log from '../entities/Log.js';

export default class LogColumnManager {
  constructor(scene) {
    this.scene = scene;
    this.logs = [];
    this.columns = [];

    for (let i = 0; i < NUM_LOG_COLUMNS; i++) {
      const colIndex = i + 2; // cols 2–16 — full river width
      const direction = (i % 2 === 0) ? 1 : -1; // alternating per column
      const speed = (Math.random() * (LOG_SPEED_MAX - LOG_SPEED_MIN) + LOG_SPEED_MIN) * direction;

      this.columns.push({ colIndex, direction, speed, logs: [] });
    }

    this.initializeColumns();
  }

  initializeColumns() {
    for (const column of this.columns) {
      const numLogs = 2; // level 1: 2 logs per column
      const spacing = Math.floor(CANVAS_HEIGHT / numLogs); // ~135px

      for (let i = 0; i < numLogs; i++) {
        const heightTiles = LOG_HEIGHT_OPTIONS[Math.floor(Math.random() * LOG_HEIGHT_OPTIONS.length)];
        // Evenly distribute with random offset within each slot
        const slotStart = i * spacing;
        const randomOffset = Math.floor(Math.random() * (spacing * 0.4));
        const startY = slotStart + randomOffset - (heightTiles * TILE);

        const log = new Log(this.scene, column.colIndex, startY, heightTiles, column.speed);
        log.gridCol = column.colIndex;
        log.id = `${column.colIndex}-${this.logs.length}`;

        this.logs.push(log);
        column.logs.push(log);
      }
    }
  }

  update(delta) {
    for (const log of this.logs) {
      log.update(delta);
    }
  }

  getAllLogs() {
    return this.logs;
  }
}
```

### Verification — A2
- [ ] Logs visible in all 15 river columns (cols 2 through 16)
- [ ] No logs in cols 0, 1 (bank/lily pad zone)
- [ ] No logs in cols 17–19 (right bank)
- [ ] Each column has exactly 2 logs
- [ ] Gaps between logs in each column visually allow gator to pass through
- [ ] Logs wrap correctly (disappear off one end, reappear on other)

---

## A3 — Game Over Screen

### Files to modify
- `src/scenes/GameOverScene.js`
- `src/scenes/GameScene.js` (scene transition calls)

### Implementation

**src/scenes/GameScene.js** — pass gameState to GameOverScene on transition:

The existing `this.scene.start('GameOverScene', { gameState: this.gameState })` calls are correct. Verify they pass `gameState` in all three exit paths:
1. `gameState.win === true`
2. `gameState.hp <= 0`
3. `gameState.padsFilled >= 5`

All three must pass `{ gameState: this.gameState }` to the scene transition.

**src/scenes/GameOverScene.js** — full rewrite:

```js
import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.gameState = data.gameState || {
      hp: 0, frogsEaten: 0, padsFilled: 0,
      win: false, timeLeft: 0, score: 0
    };
  }

  create() {
    const cx = CANVAS_WIDTH / 2;
    const gs = this.gameState;

    // Background
    this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000)
      .setOrigin(0).setAlpha(0.85);

    const titleStyle = { fontSize: '20px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold' };
    const bodyStyle  = { fontSize: '10px', fill: '#ffffff', fontFamily: 'monospace' };
    const dimStyle   = { fontSize: '10px', fill: '#aaaaaa', fontFamily: 'monospace' };

    let titleText, subtitleText;

    if (gs.win) {
      titleText    = 'YOU WIN! 🐊';
      subtitleText = 'Ate all 10 frogs!';
    } else if (gs.padsFilled >= 5) {
      titleText    = 'GAME OVER';
      subtitleText = 'All lily pads are filled!';
    } else {
      titleText    = 'GAME OVER';
      subtitleText = 'The logs got you.';
    }

    this.add.text(cx, 30, titleText, titleStyle).setOrigin(0.5);
    this.add.text(cx, 52, subtitleText, dimStyle).setOrigin(0.5);

    // Score breakdown
    // Cycle A placeholder: score = frogsEaten * 200
    const displayScore = gs.score || gs.frogsEaten * 200;
    const timeRemaining = Math.ceil((gs.timeLeft || 0) / 1000);

    const lines = [
      `Frogs Eaten:     ${gs.frogsEaten} / 10`,
      `Pads Filled:     ${gs.padsFilled} / 5`,
      gs.win
        ? `Time Remaining:  ${timeRemaining}s`
        : `Time Survived:   ${60 - timeRemaining}s`,
      ``,
      `Score:           ${displayScore}`,
    ];

    lines.forEach((line, i) => {
      this.add.text(cx, 80 + i * 16, line, bodyStyle).setOrigin(0.5);
    });

    // Restart prompt
    this.add.text(cx, CANVAS_HEIGHT - 24, '[R] Play Again', dimStyle).setOrigin(0.5);

    // R key to restart
    this.input.keyboard.once('keydown-R', () => {
      this.scene.start('GameScene');
    });
  }
}
```

### Verification — A3
- [ ] Win screen appears when 10 frogs eaten — shows correct title, frogs eaten, score
- [ ] Lose screen (HP=0) appears when HP hits 0 — shows correct title and stats
- [ ] Lose screen (pads full) appears when 5 pads filled — shows correct title and stats
- [ ] Score displayed equals frogsEaten × 200 (Cycle A placeholder)
- [ ] R key restarts cleanly — game resets fully, no leftover state
- [ ] Pressing R rapidly does not crash
- [ ] Stats shown are accurate (not stale from previous run)

---

## A4 — Title / Start Screen

### Files to create
- `src/scenes/TitleScene.js`

### Files to modify
- `src/main.js` (add TitleScene to scene list, make it first)

### Implementation

**src/scenes/TitleScene.js**:

```js
import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const cx = CANVAS_WIDTH / 2;

    // Background
    this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x1D2B53).setOrigin(0);

    const titleStyle  = { fontSize: '24px', fill: '#00E436', fontFamily: 'monospace', fontStyle: 'bold' };
    const headStyle   = { fontSize: '10px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold' };
    const bodyStyle   = { fontSize: '9px',  fill: '#aaaaaa', fontFamily: 'monospace' };
    const promptStyle = { fontSize: '10px', fill: '#FFEC27', fontFamily: 'monospace' };

    this.add.text(cx, 28, 'GATORRR 🐊', titleStyle).setOrigin(0.5);
    this.add.text(cx, 52, 'Defend your lily pads. Eat the frogs.', bodyStyle).setOrigin(0.5);

    // Controls
    this.add.text(cx, 76, 'CONTROLS', headStyle).setOrigin(0.5);
    const controls = [
      'Arrow Keys — Move',
      'Touch frogs to eat them',
      'Avoid the logs',
    ];
    controls.forEach((line, i) => {
      this.add.text(cx, 92 + i * 14, line, bodyStyle).setOrigin(0.5);
    });

    // Win condition
    this.add.text(cx, 148, 'Eat 10 frogs to win.', bodyStyle).setOrigin(0.5);
    this.add.text(cx, 162, 'Survive 60 seconds.', bodyStyle).setOrigin(0.5);
    this.add.text(cx, 176, 'Don\'t let 5 frogs reach the lily pads.', bodyStyle).setOrigin(0.5);

    // Prompt — blink
    const prompt = this.add.text(cx, CANVAS_HEIGHT - 24, 'Press any key to start', promptStyle).setOrigin(0.5);
    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    // Any key starts game
    this.input.keyboard.once('keydown', () => {
      this.scene.start('GameScene');
    });
  }
}
```

**src/main.js** — add TitleScene as first scene:

```js
import TitleScene from './scenes/TitleScene.js';
// ...
scene: [TitleScene, BootScene, GameScene, GameOverScene],
```

Wait — BootScene must run first to preload assets. Adjust order:
```js
scene: [BootScene, TitleScene, GameScene, GameOverScene],
```

And in BootScene.create(), start TitleScene instead of GameScene:
```js
create() {
  this.scene.start('TitleScene');
}
```

### Verification — A4
- [ ] Title screen shows on initial load (not GameScene)
- [ ] Title text, controls, and win conditions are readable
- [ ] "Press any key to start" prompt blinks
- [ ] Any key press starts the game (transitions to GameScene)
- [ ] Game starts cleanly — no leftover title screen elements

---

## Build & Commit Instructions

After all A1–A4 changes are implemented:

1. Run build:
```bash
cd /Users/operator/repos/MainFrame/projects/gatorrr && npm run build
```

2. If build fails: fix errors before proceeding. Do not commit a broken build.

3. If build passes, commit:
```bash
cd /Users/operator/repos/MainFrame
git add projects/gatorrr/src/ projects/gatorrr/docs/
git commit -m "feat[gatorrr] cycle A - smooth movement, log balance, game over, title screen"
```

4. Push:
```bash
git push origin agent/gatorrr/fix-crash-and-phase2
```

5. Notify:
```bash
openclaw system event --text "Done: Gatorrr Cycle A complete - ready for QA" --mode now
```

---

## QA Instructions (After Murphy Commits)

QA agent reads the current source files and verifies each item in the Success Criteria list from CYCLE_A_FEATURE_SPEC.md. For each item:
- PASS: confirmed working
- FAIL: describe exact behavior observed vs expected, file and method where the issue lives

QA report must address all 13 success criteria explicitly. Send report to Operator before any further development begins.
