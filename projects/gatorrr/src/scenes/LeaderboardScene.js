import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';

const PS2P   = "'Press Start 2P', monospace";
const GREEN  = '#00E436';
const ORANGE = '#FFA300';
const WHITE  = '#FFF1E8';
const GRAY   = '#C2C3C7';
const DIM    = '#5F574F';
const ROW_H  = 18; // px between leaderboard rows

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  init(data) {
    this.score = data?.score || 0;
    this.level = data?.level || 1;
    this.name  = ['A', 'A', 'A'];
    this.cursorIndex  = 0;
    this.nameEntered  = false;
    this.cursorVisible = true;
    this.nameInputText = null;
    this.top5Entries   = null;
    this.newEntry      = null;
  }

  create() {
    const cx = CANVAS_WIDTH  / 2;
    const cy = CANVAS_HEIGHT / 2;

    // Background
    this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000).setOrigin(0);

    // Title
    this.add.text(cx, 18, 'HIGH SCORES', {
      fontFamily: PS2P, fontSize: '12px', color: ORANGE,
    }).setOrigin(0.5);

    // Load leaderboard
    let leaderboard = [];
    try {
      leaderboard = JSON.parse(localStorage.getItem('gatorrr_leaderboard') || '[]');
    } catch (e) { /* ignore */ }

    // Build combined list and check if we made top 5
    this.newEntry = {
      score: this.score,
      level: this.level,
      name:  this.name.join(''),
      date:  new Date().toISOString(),
    };
    const newEntry = this.newEntry;
    const combined = [...leaderboard, newEntry];
    combined.sort((a, b) => b.score - a.score);
    if (combined.length > 5) combined.length = 5;

    const madeTop5 = combined.some(e => e.score === this.score && e.date === newEntry.date);

    if (!madeTop5) {
      this._drawBoard(combined, cx, 42, -1);
      this._drawReturnPrompt(cx, CANVAS_HEIGHT - 20);
      return;
    }

    // Made top 5 — show board and name entry
    this.top5Entries = combined;
    this._drawBoard(combined, cx, 42, this._findNewEntryIndex(combined));
    this._drawNameEntry(cx, 42 + 5 * ROW_H + 14);

    this.input.keyboard.on('keydown', (event) => {
      if (this.nameEntered) return;
      if      (event.key === 'ArrowUp')                           this._changeLetter(1);
      else if (event.key === 'ArrowDown')                         this._changeLetter(-1);
      else if (event.key === 'ArrowRight' || event.key === 'Enter') this._advanceCursor();
    });
  }

  _findNewEntryIndex(entries) {
    return entries.findIndex(e => e.date === this.newEntry.date);
  }

  _drawBoard(entries, cx, startY, highlightIdx) {
    for (let i = 0; i < 5; i++) {
      const entry  = entries[i];
      const rowY   = startY + i * ROW_H;
      const isNew  = (i === highlightIdx);
      const color  = isNew ? GREEN : (entry ? WHITE : DIM);

      const rankStr  = `${i + 1}.`;
      const nameStr  = entry ? (entry.name || '---').substring(0, 3) : '---';
      const scoreStr = entry ? entry.score.toString().padStart(6, ' ') : '    ---';
      const lvlStr   = entry ? `L${entry.level || 1}` : '';

      this.add.text(cx - 88, rowY, rankStr,  { fontFamily: PS2P, fontSize: '7px', color }).setOrigin(0, 0.5);
      const nameTxt = this.add.text(cx - 68, rowY, nameStr, { fontFamily: PS2P, fontSize: '7px', color }).setOrigin(0, 0.5);
      this.add.text(cx - 10, rowY, scoreStr, { fontFamily: PS2P, fontSize: '7px', color }).setOrigin(0, 0.5);
      this.add.text(cx + 60, rowY, lvlStr,   { fontFamily: PS2P, fontSize: '7px', color: GRAY }).setOrigin(0, 0.5);

      // Keep a reference to the new-entry name so _submitName can update it in-place
      if (isNew) this._entryNameText = nameTxt;

      // Arrow marker for new entry
      if (isNew) {
        this.add.text(cx - 100, rowY, '\u25b6', {
          fontFamily: PS2P, fontSize: '6px', color: GREEN,
        }).setOrigin(0, 0.5);
      }
    }
  }

  _drawNameEntry(cx, y) {
    this._nameLabel = this.add.text(cx, y, 'ENTER YOUR NAME', {
      fontFamily: PS2P, fontSize: '6px', color: ORANGE,
    }).setOrigin(0.5);

    this._nameY = y + 14;
    this._nameCX = cx;
    this._updateNameDisplay();

    // Blink cursor — store event ref so we can kill it on submit
    this._blinkEvent = this.time.addEvent({
      delay: 350,
      loop: true,
      callback: () => {
        this.cursorVisible = !this.cursorVisible;
        this._updateNameDisplay();
      },
    });
  }

  _updateNameDisplay() {
    if (this.nameInputText) this.nameInputText.destroy();

    let str = '';
    for (let i = 0; i < 3; i++) {
      const active = (i === this.cursorIndex) && this.cursorVisible;
      str += active ? `[${this.name[i]}]` : ` ${this.name[i]} `;
      if (i < 2) str += ' ';
    }

    this.nameInputText = this.add.text(this._nameCX, this._nameY, str, {
      fontFamily: PS2P,
      fontSize:   '10px',
      color:      WHITE,
    }).setOrigin(0.5);
  }

  _changeLetter(dir) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cur = letters.indexOf(this.name[this.cursorIndex]);
    this.name[this.cursorIndex] = letters[(cur + dir + 26) % 26];
    this._updateNameDisplay();
  }

  _advanceCursor() {
    if (this.cursorIndex < 2) {
      this.cursorIndex++;
      this._updateNameDisplay();
    } else {
      this._submitName();
    }
  }

  _submitName() {
    this.nameEntered = true;
    const finalName = this.name.join('');

    // Update the in-memory entry
    const idx = this.top5Entries.findIndex(e => e.date === this.newEntry.date);
    if (idx >= 0) this.top5Entries[idx].name = finalName;

    // Persist
    try {
      localStorage.setItem('gatorrr_leaderboard', JSON.stringify(this.top5Entries));
    } catch (e) { /* ignore */ }

    // Update the displayed name text in the board row without restarting
    if (this._entryNameText) {
      this._entryNameText.setText(finalName.substring(0, 3));
      this._entryNameText.setColor('#00E436');
    }

    // Tear down name input area and show return prompt
    if (this.nameInputText) { this.nameInputText.destroy(); this.nameInputText = null; }
    if (this._nameLabel)     { this._nameLabel.destroy();    this._nameLabel = null; }
    if (this._blinkEvent)    { this._blinkEvent.remove();    this._blinkEvent = null; }

    this._drawReturnPrompt(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
  }

  _drawReturnPrompt(cx, y) {
    const t = this.add.text(cx, y, 'PRESS ANY KEY', {
      fontFamily: PS2P, fontSize: '7px', color: GREEN,
    }).setOrigin(0.5);

    this.tweens.add({ targets: t, alpha: 0, duration: 350, yoyo: true, repeat: -1 });

    this.input.keyboard.once('keydown', () => {
      this.scene.start('TitleScene');
    });
  }

  shutdown() {
    this.input.keyboard.removeAllListeners();
  }
}
