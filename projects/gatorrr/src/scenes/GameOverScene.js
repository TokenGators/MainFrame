import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE } from '../constants.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.gameState = data?.gameState || {};
  }

  create() {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    // Background overlay (dimmed)
    this.add.rectangle(centerX, centerY, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.7).setOrigin(0);

    // Determine state and display appropriate message
    const isWin = this.gameState.frogsEaten >= 10;
    const loseHP = this.gameState.hp <= 0;
    const losePads = this.gameState.padsFilled >= 5;

    // Heading (win or game over)
    const heading = isWin ? 'YOU WIN!' : 'GAME OVER';
    this.add.text(centerX, centerY - 60, heading, {
      fontSize: '32px',
      fontWeight: 'bold',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Subheading for loss states
    if (!isWin) {
      const subheading = loseHP ? 'The logs got you.' : 'The frogs won.';
      this.add.text(centerX, centerY - 24, subheading, {
        fontSize: '18px',
        color: '#C2C3C7'
      }).setOrigin(0.5);
    }

    // Stats display
    const style = { fontSize: '16px', color: '#ffffff' };

    this.add.text(centerX, centerY + 12, `Frogs eaten: ${this.gameState.frogsEaten}`, style).setOrigin(0.5);
    this.add.text(centerX, centerY + 36, `Pads filled: ${this.gameState.padsFilled}/5`, style).setOrigin(0.5);

    // Time display (survived or remaining)
    const timeMs = this.gameState.timeLeft;
    const seconds = Math.ceil(timeMs / 1000);
    const timeText = !isWin ? `Time survived: ${seconds}s` : `Time remaining: ${seconds}s`;
    this.add.text(centerX, centerY + 60, timeText, style).setOrigin(0.5);

    // Score
    const score = this.gameState.frogsEaten * 200;
    this.add.text(centerX, centerY + 90, `Score: ${score}`, { ...style, color: '#FFA300' }).setOrigin(0.5);

    // Restart prompt
    const restartStyle = { fontSize: '14px', color: '#00E436' };
    this.add.text(centerX, centerY + 138, 'Press R to restart', restartStyle).setOrigin(0.5);

    // Track time for quick restart
    this.time.delayedCall(300, () => {
      this.input.keyboard.once('keydown-R', () => {
        this.scene.start('GameScene');
      });
    });
  }
}
