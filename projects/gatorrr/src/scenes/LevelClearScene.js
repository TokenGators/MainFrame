import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE } from '../constants.js';
import SoundManager from '../audio/SoundManager.js';

export default class LevelClearScene extends Phaser.Scene {
  constructor() {
    super('LevelClearScene');
  }

  init(data) {
    this.level = data?.level || 1;
    this.score = data?.score || 0;
  }

  create() {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    // Background overlay (dimmed)
    this.add.rectangle(centerX, centerY, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.7).setOrigin(0);

    // Level clear heading
    const levelText = `LEVEL ${this.level} CLEARED`;
    this.add.text(centerX, centerY - 60, levelText, {
      fontSize: '32px',
      fontWeight: 'bold',
      fontStyle: 'bold',
      color: '#00E436'
    }).setOrigin(0.5);

    // Current score display
    this.add.text(centerX, centerY - 24, `Score: ${this.score}`, {
      fontSize: '24px',
      color: '#FFA300'
    }).setOrigin(0.5);

    // Next level hint
    this.add.text(centerX, centerY + 20, `Get ready for Level ${this.level + 1}...`, {
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Play level clear sound
    this.sound = new SoundManager();
    if (this.sound.ctx.state === 'suspended') {
      this.sound.ctx.resume();
    }
    this.sound.play('levelClear');

    // Auto-advance to next level after 2 seconds
    this.time.delayedCall(2000, () => {
      this.scene.start('GameScene', { level: this.level + 1, score: this.score });
    });
  }
}
