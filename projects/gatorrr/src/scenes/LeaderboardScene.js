import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import bt, { C_WHITE, C_ORANGE, C_GREEN, C_GRAY, C_DIM } from '../ui/bitmapText.js';

const ROW_H = 18;

export default class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super('LeaderboardScene');
  }

  init(data) {
    this.score = data?.score || 0;
    this.level = data?.level || 1;
    this.name  = ['A', 'A', 'A'];
    this.cursorIndex   = 0;
    this.nameEntered   = false;
    this.cursorVisible = true;
    this.nameInputText = null;
    this._nameLabel    = null;
    this._blinkEvent   = null;
    this._entryNameText = null;
    this.top5Entries   = null;
    this.newEntry      = null;
  }

  create() {
    const cx = CANVAS_WIDTH  / 2;

    this.add.rectangle(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, 0x000000).setOrigin(0);

    bt(this, cx, 16, 'HIGH SCORES', 8, C_ORANGE).setOrigin(0.5, 0);

    let leaderboard = [];
    try {
      leaderboard = JSON.parse(localStorage.getItem('gatorrr_leaderboard') || '[]');
    } catch (e) { /* ignore */ }

    this.newEntry = {
      score: this.score, level: this.level,
      name:  this.name.join(''), date: new Date().toISOString(),
    };
    const newEntry = this.newEntry;
    const combined = [...leaderboard, newEntry];
    combined.sort((a, b) => b.score - a.score);
    if (combined.length > 5) combined.length = 5;

    const madeTop5 = combined.some(e => e.score === this.score && e.date === newEntry.date);

    if (!madeTop5) {
      this._drawBoard(combined, cx, 42, -1);
      this._drawReturnPrompt(cx, CANVAS_HEIGHT - 18);
      return;
    }

    this.top5Entries = combined;
    this._drawBoard(combined, cx, 42, this._findNewEntryIdx(combined));
    this._drawNameEntry(cx, 42 + 5 * ROW_H + 14);

    this.input.keyboard.on('keydown', (event) => {
      if (this.nameEntered) return;
      if      (event.key === 'ArrowUp')                             this._changeLetter(1);
      else if (event.key === 'ArrowDown')                           this._changeLetter(-1);
      else if (event.key === 'ArrowRight' || event.key === 'Enter') this._advanceCursor();
    });
  }

  _findNewEntryIdx(entries) {
    return entries.findIndex(e => e.date === this.newEntry.date);
  }

  _drawBoard(entries, cx, startY, highlightIdx) {
    for (let i = 0; i < 5; i++) {
      const entry  = entries[i];
      const rowY   = startY + i * ROW_H;
      const isNew  = (i === highlightIdx);
      const color  = isNew ? C_GREEN : (entry ? C_WHITE : C_DIM);

      const rankStr  = `${i + 1}.`;
      const nameStr  = entry ? (entry.name || '---').substring(0, 3) : '---';
      const scoreStr = entry ? entry.score.toString().padStart(6, ' ') : '   ---';
      const lvlStr   = entry ? `L${entry.level || 1}` : '';

      bt(this, cx - 88, rowY, rankStr,  7, color).setOrigin(0, 0.5);
      const nameTxt = bt(this, cx - 68, rowY, nameStr, 7, color).setOrigin(0, 0.5);
      bt(this, cx -  8, rowY, scoreStr, 7, color).setOrigin(0, 0.5);
      bt(this, cx + 62, rowY, lvlStr,   7, color).setOrigin(0, 0.5);

      if (isNew) {
        this._entryNameText = nameTxt;
        bt(this, cx - 100, rowY, '>', 8, C_GREEN).setOrigin(0, 0.5);
      }
    }
  }

  _drawNameEntry(cx, y) {
    this._nameLabel = bt(this, cx, y, 'ENTER YOUR NAME', 8, C_ORANGE).setOrigin(0.5, 0);
    this._nameY  = y + 14;
    this._nameCX = cx;
    this._updateNameDisplay();

    this._blinkEvent = this.time.addEvent({
      delay: 350, loop: true,
      callback: () => {
        this.cursorVisible = !this.cursorVisible;
        this._updateNameDisplay();
      },
    });
  }

  _updateNameDisplay() {
    if (this.nameInputText) { this.nameInputText.destroy(); this.nameInputText = null; }

    let str = '';
    for (let i = 0; i < 3; i++) {
      const active = (i === this.cursorIndex) && this.cursorVisible;
      str += active ? `[${this.name[i]}]` : ` ${this.name[i]} `;
      if (i < 2) str += ' ';
    }

    this.nameInputText = bt(this, this._nameCX, this._nameY, str, 8, C_WHITE).setOrigin(0.5, 0);
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

    const idx = this.top5Entries.findIndex(e => e.date === this.newEntry.date);
    if (idx >= 0) this.top5Entries[idx].name = finalName;

    try {
      localStorage.setItem('gatorrr_leaderboard', JSON.stringify(this.top5Entries));
    } catch (e) { /* ignore */ }

    if (this._entryNameText) {
      this._entryNameText.setText(finalName.substring(0, 3));
      this._entryNameText.setTint(C_GREEN);
    }
    if (this.nameInputText) { this.nameInputText.destroy(); this.nameInputText = null; }
    if (this._nameLabel)    { this._nameLabel.destroy();    this._nameLabel = null; }
    if (this._blinkEvent)   { this._blinkEvent.remove();    this._blinkEvent = null; }

    this._drawReturnPrompt(CANVAS_WIDTH / 2, CANVAS_HEIGHT - 18);
  }

  _drawReturnPrompt(cx, y) {
    const t = bt(this, cx, y, 'PRESS ANY KEY', 8, C_GREEN).setOrigin(0.5, 0);
    this.tweens.add({ targets: t, alpha: 0, duration: 350, yoyo: true, repeat: -1 });
    this.input.keyboard.once('keydown', () => this.scene.start('TitleScene'));
  }

  shutdown() {
    this.input.keyboard.removeAllListeners();
  }
}
