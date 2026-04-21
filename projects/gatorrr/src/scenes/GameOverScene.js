import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import { getSoundManager } from '../audio/SoundManager.js';
import bt, { C_WHITE, C_ORANGE, C_GREEN, C_GRAY, C_RED } from '../ui/bitmapText.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.gameState = data?.gameState || {};
  }

  create() {
    const cx    = CANVAS_WIDTH  / 2;
    const cy    = CANVAS_HEIGHT / 2;
    const isWin = this.gameState.frogsEaten >= 10;

    this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.8).setOrigin(0);

    // ── Heading ───────────────────────────────────────────────────────────
    const heading = isWin ? 'YOU WIN!' : 'GAME OVER';
    bt(this, cx, cy - 80, heading, 16, isWin ? C_GREEN : C_RED).setOrigin(0.5);

    // ── Loss subheading ───────────────────────────────────────────────────
    if (!isWin) {
      const loseHP   = this.gameState.hp <= 0;
      const sub      = loseHP ? 'THE LOGS GOT YOU.' : 'THE FROGS WON.';
      bt(this, cx, cy - 52, sub, 8, C_GRAY).setOrigin(0.5);
    }

    // ── Score breakdown ───────────────────────────────────────────────────
    const winBonus   = isWin ? (this.gameState.winBonus  || 0) : 0;
    const timeBonus  = isWin ? (this.gameState.timeBonus || 0) : 0;
    const padPenalty = this.gameState.padPenaltyTotal || 0;
    const frogPts    = this.gameState.score - winBonus - timeBonus - padPenalty;
    const total      = this.gameState.score;

    let rowY = cy - 24;
    const ROW = 14;

    if (frogPts !== 0 || this.gameState.frogsEaten > 0) {
      bt(this, cx, rowY, `FROGS  +${frogPts}`, 8, C_WHITE).setOrigin(0.5); rowY += ROW;
    }
    if (padPenalty > 0) {
      bt(this, cx, rowY, `PADS   -${padPenalty}`, 8, C_RED).setOrigin(0.5); rowY += ROW;
    }
    if (isWin) {
      bt(this, cx, rowY, `WIN BONUS  +${winBonus}`,  7, C_GREEN).setOrigin(0.5); rowY += ROW;
      bt(this, cx, rowY, `TIME BONUS +${timeBonus}`, 8, C_GREEN).setOrigin(0.5); rowY += ROW;
    }

    rowY += 6;
    bt(this, cx, rowY, `TOTAL  ${total}`, 8, C_ORANGE).setOrigin(0.5);

    const sound = getSoundManager();
    sound.ctx.resume().then(() => sound.play('gameOver'));

    this.time.delayedCall(2000, () => {
      this.scene.start('LeaderboardScene', { score: total, level: this.gameState.currentLevel || 1 });
    });
  }
}
