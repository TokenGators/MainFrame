import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    // Game title (large, prominent)
    this.add.text(centerX, centerY - 100, 'GATORRR', {
      fontSize: '48px',
      fontWeight: 'bold',
      fontStyle: 'bold',
      color: '#00E436'
    }).setOrigin(0.5);

    // Description (one sentence)
    this.add.text(centerX, centerY - 64, 'Eat the frogs before they fill the lily pads.', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Controls info
    this.add.text(centerX, centerY - 28, 'Controls: Arrow keys to move', {
      fontSize: '16px',
      color: '#C2C3C7'
    }).setOrigin(0.5);

    // Win condition
    this.add.text(centerX, centerY + 8, 'Win: Eat 10 frogs', {
      fontSize: '16px',
      color: '#00E436'
    }).setOrigin(0.5);

    // Lose conditions
    this.add.text(centerX, centerY + 44, 'Lose: HP reaches 0 or 5 pads filled', {
      fontSize: '16px',
      color: '#FFA300'
    }).setOrigin(0.5);

    // Blinking start prompt (tween alpha 0↔1 forever)
    this.startText = this.add.text(centerX, centerY + 80, 'Press any key to start', {
      fontSize: '20px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.startText,
      alpha: 0,
      duration: 250,
      yoyo: true,
      repeat: -1,
      delay: 0
    });

    // Any key starts game
    this.input.keyboard.once('keydown', () => {
      this.scene.start('GameScene');
    });
  }
}
