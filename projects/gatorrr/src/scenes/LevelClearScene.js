import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import { getSoundManager } from '../audio/SoundManager.js';
import bt, { C_WHITE, C_ORANGE, C_GREEN } from '../ui/bitmapText.js';

export default class LevelClearScene extends Phaser.Scene {
  constructor() {
    super('LevelClearScene');
  }

  init(data) {
    this.level = data?.level || 1;
    this.score = data?.score || 0;
  }

  create() {
    const cx = CANVAS_WIDTH  / 2;
    const cy = CANVAS_HEIGHT / 2;

    this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.8).setOrigin(0);

    bt(this, cx, cy - 60, `LEVEL ${this.level} CLEAR`, 16, C_GREEN).setOrigin(0.5);
    bt(this, cx, cy - 24, `SCORE  ${this.score}`,       8, C_ORANGE).setOrigin(0.5);
    bt(this, cx, cy + 20, `LEVEL ${this.level + 1} INCOMING...`, 8, C_WHITE).setOrigin(0.5);

    const sound = getSoundManager();
    sound.ctx.resume().then(() => sound.play('levelClear'));

    this.time.delayedCall(2000, () => {
      this.scene.start('GameScene', { level: this.level + 1, score: this.score });
    });
  }
}
