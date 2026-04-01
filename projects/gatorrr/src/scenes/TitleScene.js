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
    this.add.text(centerX, centerY - 120, 'GATORRR', {
      fontSize: '48px',
      fontWeight: 'bold',
      fontStyle: 'bold',
      color: '#00E436'
    }).setOrigin(0.5);

    // Description (one sentence)
    this.add.text(centerX, centerY - 96, 'Eat the frogs before they fill the lily pads.', {
      fontSize: '18px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Controls info
    this.add.text(centerX, centerY - 60, 'Controls: Arrow keys to move', {
      fontSize: '16px',
      color: '#C2C3C7'
    }).setOrigin(0.5);

    // Win condition
    this.add.text(centerX, centerY - 36, 'Win: Eat 10 frogs', {
      fontSize: '16px',
      color: '#00E436'
    }).setOrigin(0.5);

    // Lose conditions
    this.add.text(centerX, centerY - 12, 'Lose: HP reaches 0 or 5 pads filled', {
      fontSize: '16px',
      color: '#FFA300'
    }).setOrigin(0.5);

    // Leaderboard section
    this.showLeaderboard(centerX, centerY + 20);

    // Blinking start prompt (tween alpha 0↔1 forever)
    this.startText = this.add.text(centerX, centerY + 100, 'Press any key to start', {
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

  showLeaderboard(centerX, y) {
    this.add.text(centerX, y - 20, 'LEADERBOARD', {
      fontSize: '16px',
      fontWeight: 'bold',
      color: '#FFA300'
    }).setOrigin(0.5);

    try {
      const leaderboard = JSON.parse(localStorage.getItem('gatorrr_leaderboard') || '[]');
      
      if (leaderboard.length === 0) {
        this.add.text(centerX, y, 'No scores yet', {
          fontSize: '14px',
          color: '#C2C3C7'
        }).setOrigin(0.5);
        return;
      }

      // Show top 5
      const maxToShow = Math.min(leaderboard.length, 5);
      for (let i = 0; i < maxToShow; i++) {
        const entry = leaderboard[i];
        const date = new Date(entry.date);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        
        this.add.text(centerX, y + 15 + (i * 14), `${i + 1}. ${entry.score} (Lvl ${entry.level}) ${dateStr}`, {
          fontSize: '12px',
          color: '#ffffff'
        }).setOrigin(0.5);
      }
    } catch (e) {
      // localStorage not available - silently skip
      this.add.text(centerX, y, 'No scores yet', {
        fontSize: '14px',
        color: '#C2C3C7'
      }).setOrigin(0.5);
    }
  }
}
