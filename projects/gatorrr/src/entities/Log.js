import Phaser from 'phaser';
import { C, LOG_WIDTH, TILE, CANVAS_HEIGHT } from '../constants.js';

// Two-tone log palette — both are valid PICO-8 browns
const LOG_TONES = [C.BROWN, C.DARK_GRAY]; // 0xAB5236, 0x5F574F

export default class Log extends Phaser.GameObjects.Rectangle {
  constructor(scene, colIndex, y, heightTiles, speed) {
    const h = heightTiles * TILE;
    super(scene, colIndex * TILE, y, LOG_WIDTH, h);

    this.scene = scene;
    this.colIndex = colIndex;
    this.speed = speed;
    this.gridCol = colIndex;

    // Random tone per log
    this._tone = LOG_TONES[Math.floor(Math.random() * LOG_TONES.length)];
    this.setFillStyle(this._tone);
    this.setOrigin(0);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.setDepth(1);

    // --- Decorations (drawn on top, tracked in update) ---

    // End caps: top and bottom 3px strip in the alternate shade
    const capColor = this._tone === C.BROWN ? C.DARK_GRAY : C.BROWN;
    this._capTop = scene.add.rectangle(this.x, this.y, LOG_WIDTH, 3, capColor)
      .setOrigin(0, 0).setDepth(1.05);
    this._capBot = scene.add.rectangle(this.x, this.y + h - 3, LOG_WIDTH, 3, capColor)
      .setOrigin(0, 0).setDepth(1.05);

    // Grain lines: horizontal light-gray 1px streaks at 1/4, 1/2, 3/4 height
    this._grainGfx = scene.add.graphics().setDepth(1.1);
    this._drawGrain();

    // Knot spots: 2–3 small cream/white rectangles scattered on the log body
    this._knots = [];
    const numKnots = 2 + Math.floor(Math.random() * 2); // 2 or 3
    for (let k = 0; k < numKnots; k++) {
      // Keep spots away from end caps and edges
      const kx = 3 + Math.random() * (LOG_WIDTH - 8);
      const ky = 6 + Math.random() * (h - 12);
      const knot = scene.add.rectangle(
        this.x + kx, this.y + ky,
        3, 2, C.WHITE
      ).setOrigin(0.5).setDepth(1.15);
      knot._offX = kx;
      knot._offY = ky;
      this._knots.push(knot);
    }
  }

  _drawGrain() {
    const gfx = this._grainGfx;
    gfx.clear();
    gfx.fillStyle(C.LIGHT_GRAY, 0.45);
    const steps = [0.28, 0.52, 0.76];
    for (const t of steps) {
      const lineY = Math.round(this.y + t * this.height);
      gfx.fillRect(this.x + 2, lineY, LOG_WIDTH - 4, 1);
    }
  }

  update(delta) {
    this.y += this.speed * (delta / 1000);

    // Wrap when fully off screen
    if (this.y > CANVAS_HEIGHT) {
      this.y = -this.height;
    } else if (this.y + this.height < 0) {
      this.y = CANVAS_HEIGHT;
    }

    // Sync decoration positions
    this._capTop.x = this.x;
    this._capTop.y = this.y;
    this._capBot.x = this.x;
    this._capBot.y = this.y + this.height - 3;

    this._drawGrain();

    for (const knot of this._knots) {
      knot.x = this.x + knot._offX;
      knot.y = this.y + knot._offY;
    }
  }

  isOffScreen() {
    return this.y > CANVAS_HEIGHT || this.y + this.height < 0;
  }

  destroy(fromScene) {
    if (this._capTop) { this._capTop.destroy(); this._capTop = null; }
    if (this._capBot) { this._capBot.destroy(); this._capBot = null; }
    if (this._grainGfx) { this._grainGfx.destroy(); this._grainGfx = null; }
    for (const k of this._knots) { k.destroy(); }
    this._knots = [];
    super.destroy(fromScene);
  }
}
