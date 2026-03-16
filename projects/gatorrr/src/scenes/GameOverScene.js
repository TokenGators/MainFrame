import Phaser from 'phaser';
import { C } from '../constants.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    // Receive game result data (win/lose, reason, stats)
    this.result = data.result || 'lose';
    this.reason = data.reason || '';
    this.stats = data.stats || {};
  }

  create() {
    // Display outcome text using bitmap font
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const text = this.add.text(centerX, centerY, 
      this.result === 'win' ? 'YOU WIN!' : 'GAME OVER', 
      { 
        fontSize: '32px', 
        color: this.result === 'win' ? '#FF004D' : '#1D2B53',
        fontFamily: 'Courier New'
      }
    );
    text.setOrigin(0.5);

    // Display stats
    const statsText = this.add.text(centerX, centerY + 50, 
      `Frogs Eaten: ${this.stats.frogsEaten}\nPads Filled: ${this.stats.padsFilled}`, 
      { 
        fontSize: '16px', 
        color: '#FFF1E8',
        fontFamily: 'Courier New'
      }
    );
    statsText.setOrigin(0.5);

    // Listen for R key to restart
    const restartKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    restartKey.on('down', () => {
      this.scene.start('GameScene');
    });

    // Display restart instruction
    const restartText = this.add.text(centerX, centerY + 120, 
      'Press R to Restart', 
      { 
        fontSize: '16px', 
        color: '#FFF1E8',
        fontFamily: 'Courier New'
      }
    );
    restartText.setOrigin(0.5);
  }
}