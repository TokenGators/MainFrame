import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import bt, { C_WHITE, C_ORANGE, C_YELLOW, C_GREEN, C_GRAY, C_DIM } from '../ui/bitmapText.js';

const LOGO_MAX_W = 300;

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const cx = CANVAS_WIDTH  / 2;

    // ── HI-SCORE header ───────────────────────────────────────────────────
    bt(this, cx, 10, 'HI-SCORE', 8, C_ORANGE).setOrigin(0.5, 0);

    const hiScore = this._getHiScore();
    bt(this, cx, 22, hiScore.toString().padStart(6, '0'), 8, C_WHITE).setOrigin(0.5, 0);

    // ── Logo ──────────────────────────────────────────────────────────────
    const logo = this.add.image(cx, 0, 'logo').setOrigin(0.5, 0);
    if (logo.width > LOGO_MAX_W) logo.setScale(LOGO_MAX_W / logo.width);

    const logoH   = logo.height * logo.scaleY;
    const zoneTop = 40;
    const zoneBot = 220;
    logo.y = zoneTop + (zoneBot - zoneTop - logoH) / 2;

    // ── INSERT COIN + bouncing coin ───────────────────────────────────────
    const coinTextY = logo.y + logoH + Math.max(22, (zoneBot - logo.y - logoH) / 2);

    const coinText = bt(this, cx, coinTextY, 'INSERT COIN', 8, C_YELLOW).setOrigin(0.5, 0);

    this.time.addEvent({
      delay: 333,
      loop: true,
      callback: () => { coinText.setVisible(!coinText.visible); },
    });

    const coinSprite  = this.add.image(cx, coinTextY - 18, 'coin').setOrigin(0.5).setDepth(5);
    const coinBaseY   = coinSprite.y;
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const t = this.time.now / 1000;
        coinSprite.scaleX = Math.abs(Math.cos(t * Math.PI * 1.4));
        coinSprite.y      = coinBaseY + Math.sin(t * Math.PI * 1.1) * 4;
      },
    });

    // ── Footer ────────────────────────────────────────────────────────────
    bt(this, cx, CANVAS_HEIGHT - 20, 'SUPERPAPERTHINGS (C) 2026', 8, C_DIM).setOrigin(0.5, 0);
    bt(this, CANVAS_WIDTH - 4, CANVAS_HEIGHT - 10, 'CREDITS  00', 8, C_GRAY).setOrigin(1, 0);

    // ── Input ─────────────────────────────────────────────────────────────
    this._howToPlayVisible = false;
    this._htpOverlay = null;

    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'h' || event.key === 'H') {
        this._howToPlayVisible ? this._dismissHowToPlay() : this._showHowToPlay();
      } else if (!this._howToPlayVisible) {
        this.scene.start('GameScene');
      } else {
        this._dismissHowToPlay();
      }
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  _getHiScore() {
    try {
      const board = JSON.parse(localStorage.getItem('gatorrr_leaderboard') || '[]');
      if (board.length === 0) return 0;
      return Math.max(...board.map(e => e.score || 0));
    } catch (e) {
      return 0;
    }
  }

  _showHowToPlay() {
    this._howToPlayVisible = true;
    const cx = CANVAS_WIDTH  / 2;
    const cy = CANVAS_HEIGHT / 2;

    const panel = this.add.rectangle(cx, cy, CANVAS_WIDTH - 24, CANVAS_HEIGHT - 32, 0x000000, 0.94)
      .setOrigin(0.5).setDepth(50);

    const lines = [
      { text: 'HOW TO PLAY',              color: C_GREEN,  size: 8, dy: -76 },
      { text: 'EAT 10 FROGS TO WIN',      color: C_WHITE,  size: 8, dy: -54 },
      { text: 'LOSE IF HP HITS 0',        color: C_WHITE,  size: 8, dy: -42 },
      { text: 'LOSE IF 5 PADS FILL UP',   color: C_WHITE,  size: 8, dy: -30 },
      { text: 'ARROWS - MOVE',            color: C_GRAY,   size: 8, dy: -10 },
      { text: 'SPACE  - DIVE',            color: C_GRAY,   size: 8, dy:   2 },
      { text: 'SHIFT+DIR - BITE LOG',     color: C_GRAY,   size: 8, dy:  14 },
      { text: 'GREEN 200   BLUE 500',     color: C_GREEN,  size: 8, dy:  32 },
      { text: 'RED 1500   GOLD 2000',     color: C_ORANGE, size: 8, dy:  44 },
      { text: 'PRESS ANY KEY TO CLOSE',   color: C_ORANGE, size: 8, dy:  66 },
    ];

    const objects = [panel];
    for (const l of lines) {
      objects.push(
        bt(this, cx, cy + l.dy, l.text, l.size, l.color)
          .setOrigin(0.5).setDepth(51)
      );
    }
    this._htpOverlay = objects;
  }

  _dismissHowToPlay() {
    if (this._htpOverlay) {
      for (const obj of this._htpOverlay) obj.destroy();
      this._htpOverlay = null;
    }
    this._howToPlayVisible = false;
  }
}
