import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

const PS2P   = "'Press Start 2P', monospace";
const GREEN  = '#00E436';
const ORANGE = '#FFA300';
const WHITE  = '#FFF1E8';
const GRAY   = '#C2C3C7';
const DIM    = '#5F574F';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const cx = CANVAS_WIDTH / 2;
    let y = 22;

    // ── Title ─────────────────────────────────────────────────────────────
    this.add.text(cx, y, 'GATORRR', {
      fontFamily: PS2P,
      fontSize: '20px',
      color: GREEN,
    }).setOrigin(0.5);
    y += 26;

    // ── Tagline ───────────────────────────────────────────────────────────
    this.add.text(cx, y, 'Eat frogs. Avoid the pads.', {
      fontFamily: PS2P,
      fontSize: '6px',
      color: WHITE,
    }).setOrigin(0.5);
    y += 14;

    // ── Controls hint ─────────────────────────────────────────────────────
    this.add.text(cx, y, 'ARROWS move  SPACE dive  SHIFT+dir bite', {
      fontFamily: PS2P,
      fontSize: '5px',
      color: GRAY,
    }).setOrigin(0.5);
    y += 11;

    // ── How to Play hint ──────────────────────────────────────────────────
    const htpHint = this.add.text(cx, y, 'H \u2014 how to play', {
      fontFamily: PS2P,
      fontSize: '5px',
      color: ORANGE,
    }).setOrigin(0.5);
    y += 16;

    // ── Leaderboard (top 3) ───────────────────────────────────────────────
    this.add.text(cx, y, '\u2500\u2500 TOP SCORES \u2500\u2500', {
      fontFamily: PS2P,
      fontSize: '7px',
      color: ORANGE,
    }).setOrigin(0.5);
    y += 14;

    this._showTop3(cx, y);
    y += 46; // 3 rows × ~15px

    // ── Start prompt (blinking) ───────────────────────────────────────────
    const startText = this.add.text(cx, y, 'PRESS ANY KEY', {
      fontFamily: PS2P,
      fontSize: '8px',
      color: WHITE,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0,
      duration: 300,
      yoyo: true,
      repeat: -1,
    });

    // ── H key shows How to Play overlay ───────────────────────────────────
    this._howToPlayVisible = false;
    this._htpOverlay = null;

    this.input.keyboard.on('keydown', (event) => {
      if (event.key === 'h' || event.key === 'H') {
        if (this._howToPlayVisible) {
          this._dismissHowToPlay();
        } else {
          this._showHowToPlay();
        }
      } else if (!this._howToPlayVisible) {
        this.scene.start('GameScene');
      } else {
        this._dismissHowToPlay();
      }
    });
  }

  _showTop3(cx, y) {
    let leaderboard = [];
    try {
      leaderboard = JSON.parse(localStorage.getItem('gatorrr_leaderboard') || '[]');
    } catch (e) { /* ignore */ }

    for (let i = 0; i < 3; i++) {
      const entry = leaderboard[i];
      const rowY = y + i * 14;
      const rank = `${i + 1}.`;
      if (entry) {
        const name  = (entry.name  || '---').padEnd(3, ' ');
        const score = entry.score.toString().padStart(5, ' ');
        const lvl   = `L${entry.level || 1}`;
        this.add.text(cx - 60, rowY, rank,  { fontFamily: PS2P, fontSize: '7px', color: GRAY }).setOrigin(0, 0.5);
        this.add.text(cx - 40, rowY, name,  { fontFamily: PS2P, fontSize: '7px', color: WHITE }).setOrigin(0, 0.5);
        this.add.text(cx + 4,  rowY, score, { fontFamily: PS2P, fontSize: '7px', color: WHITE }).setOrigin(0, 0.5);
        this.add.text(cx + 50, rowY, lvl,   { fontFamily: PS2P, fontSize: '7px', color: GRAY  }).setOrigin(0, 0.5);
      } else {
        this.add.text(cx - 60, rowY, rank,  { fontFamily: PS2P, fontSize: '7px', color: DIM }).setOrigin(0, 0.5);
        this.add.text(cx - 40, rowY, '---', { fontFamily: PS2P, fontSize: '7px', color: DIM }).setOrigin(0, 0.5);
        this.add.text(cx + 4,  rowY, '  ---', { fontFamily: PS2P, fontSize: '7px', color: DIM }).setOrigin(0, 0.5);
      }
    }
  }

  _showHowToPlay() {
    this._howToPlayVisible = true;
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT / 2;

    // Semi-transparent backing panel
    const panel = this.add.rectangle(cx, cy, CANVAS_WIDTH - 32, CANVAS_HEIGHT - 40, 0x000000, 0.92)
      .setOrigin(0.5).setDepth(50);

    const lines = [
      { text: 'HOW TO PLAY',   color: GREEN,  size: '8px',  dy: -72 },
      { text: 'EAT 10 FROGS TO WIN',          color: WHITE,  size: '6px',  dy: -50 },
      { text: 'LOSE IF HP HITS 0',            color: WHITE,  size: '6px',  dy: -38 },
      { text: 'LOSE IF 5 PADS FILL UP',       color: WHITE,  size: '6px',  dy: -26 },
      { text: '',                              color: WHITE,  size: '6px',  dy: -14 },
      { text: 'ARROWS \u2014 MOVE',           color: GRAY,   size: '6px',  dy: -2  },
      { text: 'SPACE \u2014 DIVE UNDER LOGS', color: GRAY,   size: '6px',  dy: 10  },
      { text: 'SHIFT+DIR \u2014 BITE LOGS',   color: GRAY,   size: '6px',  dy: 22  },
      { text: '',                              color: WHITE,  size: '6px',  dy: 34  },
      { text: 'GREEN  200    BLUE  500',       color: GREEN,  size: '5px',  dy: 46  },
      { text: 'RED  1500    GOLD  2000',       color: ORANGE, size: '5px',  dy: 57  },
      { text: '',                              color: WHITE,  size: '5px',  dy: 68  },
      { text: 'PRESS ANY KEY TO CLOSE',        color: ORANGE, size: '5px',  dy: 78  },
    ];

    const objects = [panel];
    for (const l of lines) {
      if (!l.text) continue;
      objects.push(
        this.add.text(cx, cy + l.dy, l.text, {
          fontFamily: PS2P,
          fontSize: l.size,
          color: l.color,
        }).setOrigin(0.5).setDepth(51)
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
