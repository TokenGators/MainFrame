import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE, SCORE_WIN_BONUS, SCORE_TIME_BONUS_PER_SEC } from '../constants.js';

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
    const isWin = this.gameState.frogsEaten >= 10;

    // Background overlay (dimmed)
    this.add.rectangle(centerX, centerY, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.7).setOrigin(0);

    // Determine state and display appropriate message
    const loseHP = this.gameState.hp <= 0;
    const losePads = this.gameState.padsFilled >= 5;

    // Heading (win or game over)
    const heading = isWin ? 'YOU WIN!' : 'GAME OVER';
    this.add.text(centerX, centerY - 80, heading, {
      fontSize: '32px',
      fontWeight: 'bold',
      fontStyle: 'bold',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Subheading for loss states
    if (!isWin) {
      const subheading = loseHP ? 'The logs got you.' : 'The frogs won.';
      this.add.text(centerX, centerY - 44, subheading, {
        fontSize: '18px',
        color: '#C2C3C7'
      }).setOrigin(0.5);
    }

    // Score breakdown display
    const style = { fontSize: '14px', color: '#ffffff' };

    // Calculate components
    const winBonus = isWin ? this.gameState.winBonus : 0;
    const timeBonus = isWin ? this.gameState.timeBonus : 0;
    const totalFrogPoints = this.gameState.score - winBonus - timeBonus - (this.gameState.padPenaltyTotal || 0);
    const totalScore = this.gameState.score;

    // Only show frog points if there were any (not just bonuses/penalties)
    if (totalFrogPoints !== 0 || this.gameState.frogsEaten > 0) {
      this.add.text(centerX, centerY - 12, `Frog points: +${totalFrogPoints}`, style).setOrigin(0.5);
    }

    if (this.gameState.padPenaltyTotal > 0) {
      this.add.text(centerX, centerY + 4, `Pad penalties: -${this.gameState.padPenaltyTotal}`, { ...style, color: '#FF004D' }).setOrigin(0.5);
    }

    if (isWin) {
      this.add.text(centerX, centerY + 20, `Win bonus: +${winBonus}`, { ...style, color: '#00E436' }).setOrigin(0.5);
      this.add.text(centerX, centerY + 36, `Time bonus: +${timeBonus}`, { ...style, color: '#00E436' }).setOrigin(0.5);
    }

    // Total score
    this.add.text(centerX, centerY + 60, `Total: ${totalScore}`, { ...style, color: '#FFA300', fontSize: '18px' }).setOrigin(0.5);

    // Leaderboard status
    this.showLeaderboardStatus(centerX, centerY + 84);

    // Restart prompt
    const restartStyle = { fontSize: '14px', color: '#00E436' };
    this.add.text(centerX, centerY + 120, 'Press R to restart', restartStyle).setOrigin(0.5);

    // Track time for quick restart
    this.time.delayedCall(300, () => {
      this.input.keyboard.once('keydown-R', () => {
        this.scene.start('GameScene');
      });
    });
  }

  showLeaderboardStatus(centerX, y) {
    try {
      const leaderboard = JSON.parse(localStorage.getItem('gatorrr_leaderboard') || '[]');
      const newScore = this.gameState.score;
      
      // Check if new score would make top 5
      const combined = [...leaderboard, { score: newScore, level: 1, date: new Date().toISOString() }];
      combined.sort((a, b) => b.score - a.score);
      
      if (combined.length > 5) {
        combined.length = 5;
      }
      
      const rank = combined.findIndex(entry => entry.score === newScore && entry.date === (new Date().toISOString())) + 1;
      
      const statusText = rank <= 5 && rank > 0 ? `Rank #${rank} on leaderboard!` : `New High Score!`;
      
      this.add.text(centerX, y, statusText, { fontSize: '14px', color: '#FFA300' }).setOrigin(0.5);
    } catch (e) {
      // localStorage not available - silently skip
    }
  }
}
