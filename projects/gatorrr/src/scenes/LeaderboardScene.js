import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE, C } from '../constants.js';

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  init(data) {
    this.score = data?.score || 0;
    this.level = data?.level || 1;
    this.name = ['A', 'A', 'A'];
    this.cursorIndex = 0;
    this.nameEntered = false;
  }

  create() {
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    // Background overlay
    this.add.rectangle(centerX, centerY, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000, 0.9).setOrigin(0);

    // Title
    this.add.text(centerX, centerY - 110, 'HIGH SCORES', {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#FFA300'
    }).setOrigin(0.5);

    // Read leaderboard from localStorage
    let leaderboard = [];
    try {
      leaderboard = JSON.parse(localStorage.getItem('gatorrr_leaderboard') || '[]');
    } catch (e) {
      // Ignore localStorage errors
    }

    // Check if current score makes top 5
    const newEntry = { score: this.score, level: this.level, name: this.name.join(''), date: new Date().toISOString() };
    const combined = [...leaderboard, newEntry];
    combined.sort((a, b) => b.score - a.score);

    // Trim to top 5
    if (combined.length > 5) {
      combined.length = 5;
    }

    // Save if we made top 5
    let madeTop5 = false;
    if (combined.length === 5) {
      // Find if our score is in the top 5
      madeTop5 = combined.some(e => e.score === this.score && e.date === newEntry.date);
    }

    // If not in top 5, show scores and return to title
    if (!madeTop5) {
      this.showLeaderboard(combined, centerX, centerY);
      this.showReturnPrompt(centerX, centerY + 120);
      return;
    }

    // We made top 5 - show name input
    this.top5Entries = combined;
    this.showLeaderboard(combined, centerX, centerY - 20);
    this.showNameInput(centerX, centerY + 40);

    // Setup keyboard input for name entry
    this.input.keyboard.on('keydown', (event) => {
      if (this.nameEntered) return;

      if (event.key === 'ArrowUp') {
        this.changeLetter(1);
      } else if (event.key === 'ArrowDown') {
        this.changeLetter(-1);
      } else if (event.key === 'ArrowRight' || event.key === 'Enter') {
        this.advanceCursor();
      }
    });
  }

  changeLetter(direction) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const currentIndex = letters.indexOf(this.name[this.cursorIndex]);
    const newIndex = (currentIndex + direction + 26) % 26;
    this.name[this.cursorIndex] = letters[newIndex];
    this.updateNameDisplay();
  }

  advanceCursor() {
    if (this.cursorIndex < 2) {
      this.cursorIndex++;
    } else {
      // Last character - submit name
      this.submitName();
    }
    this.updateNameDisplay();
  }

  submitName() {
    this.nameEntered = true;

    // Update the entry with the final name
    const entryIndex = this.top5Entries.findIndex(e => e.score === this.score && e.date === (new Date().toISOString()));
    if (entryIndex >= 0) {
      this.top5Entries[entryIndex].name = this.name.join('');
    }

    // Save to localStorage
    try {
      localStorage.setItem('gatorrr_leaderboard', JSON.stringify(this.top5Entries));
    } catch (e) {
      // Ignore localStorage errors
    }

    this.showLeaderboard(this.top5Entries, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    this.showReturnPrompt(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
  }

  showLeaderboard(entries, centerX, y) {
    const style = { fontSize: '16px', color: '#ffffff', fontFamily: 'monospace' };
    const spacing = 24;

    entries.forEach((entry, i) => {
      const isCurrent = entry.score === this.score && entry.name === this.name.join('');
      const color = isCurrent ? '#00E436' : '#ffffff';
      const rankText = (i + 1).toString().padStart(2, ' ');

      this.add.text(centerX - 80, y + 10 + (i * spacing), `${rankText}.`, { ...style, color });
      this.add.text(centerX - 40, y + 10 + (i * spacing), entry.name || '---', { ...style, color });
      this.add.text(centerX + 40, y + 10 + (i * spacing), entry.score.toString(), { ...style, color });
      this.add.text(centerX + 100, y + 10 + (i * spacing), `LVL ${entry.level || 1}`, { ...style, color });
    });

    // Fill empty slots
    for (let i = entries.length; i < 5; i++) {
      const rankText = (i + 1).toString().padStart(2, ' ');
      this.add.text(centerX - 80, y + 10 + (i * spacing), `${rankText}.`, { ...style, color: '#666' });
      this.add.text(centerX - 40, y + 10 + (i * spacing), '---', { ...style, color: '#666' });
      this.add.text(centerX + 40, y + 10 + (i * spacing), '---', { ...style, color: '#666' });
      this.add.text(centerX + 100, y + 10 + (i * spacing), 'LVL -', { ...style, color: '#666' });
    }
  }

  showNameInput(centerX, y) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cursor = '_';
    const blinkSpeed = 400;

    // Blinking cursor tween
    this.tweens.add({
      targets: this,
      cursorVisible: true,
      duration: blinkSpeed,
      yoyo: true,
      repeat: -1,
      onUpdate: () => {
        this.updateNameDisplay();
      }
    });
  }

  updateNameDisplay() {
    // Remove existing name input text if any
    if (this.nameInputText) {
      this.nameInputText.destroy();
    }

    const centerX = CANVAS_WIDTH / 2;
    const y = CANVAS_HEIGHT / 2 + 40;

    // Build name string with cursor
    let nameText = '';
    for (let i = 0; i < 3; i++) {
      const bracketStart = (i === this.cursorIndex && this.cursorVisible) ? '[' : ' ';
      const letter = this.name[i];
      const bracketEnd = (i === this.cursorIndex && this.cursorVisible) ? ']' : ' ';
      nameText += `${bracketStart}${letter}${bracketEnd} `;
    }

    this.nameInputText = this.add.text(centerX, y, nameText, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    this.nameInputText.setText(nameText);
  }

  showReturnPrompt(centerX, y) {
    this.add.text(centerX, y, 'Press any key to continue', {
      fontSize: '16px',
      color: '#00E436'
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown', () => {
      this.scene.start('TitleScene');
    });
  }

  shutdown() {
    this.input.keyboard.removeAllListeners();
  }
}
