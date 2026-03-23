import Phaser from 'phaser';
import { C, GATOR_START, MAX_HP, TILE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants.js';
import Gator from '../entities/Gator.js';
import FrogSpawner from '../managers/FrogSpawner.js';
import LogColumnManager from '../managers/LogColumnManager.js';
import CollisionSystem from '../managers/CollisionSystem.js';
import LilyPad from '../entities/LilyPad.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init() {
    this.gameState = {
      hp: MAX_HP,
      frogsEaten: 0,
      padsFilled: 0,
      gameOver: false,
      win: false,
      timeLeft: 60000,
      score: 0
    };

    this.cursors = null;
    this.gator = null;
    this.frogSpawner = null;
    this.logManager = null;
    this.collisionSystem = null;
    this.lilyPads = [];
    this.hud = null;
  }

  create() {
    this.cursors = this.input.keyboard.createCursorKeys();

    this.gator = new Gator(this, GATOR_START.col, GATOR_START.row);

    this.frogSpawner = new FrogSpawner(this);
    this.logManager = new LogColumnManager(this);
    this.collisionSystem = new CollisionSystem(this);

    this.createBackground();
    this.createLilyPads();
    this.createHUD();

    // Countdown timer — fires every second
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });
  }

  createBackground() {
    // Left bank (col 0): rectangle(0,0,TILE,CANVAS_HEIGHT, 0x008751) depth -1
    this.add.rectangle(0, 0, TILE, CANVAS_HEIGHT, 0x008751).setOrigin(0).setDepth(-1);
    
    // Lily zone (col 1): rectangle(TILE,0,TILE,CANVAS_HEIGHT, 0x00A860) depth -1
    this.add.rectangle(TILE, 0, TILE, CANVAS_HEIGHT, 0x00A860).setOrigin(0).setDepth(-1);
    
    // River (cols 2-16): rectangle(TILE*2,0,TILE*15,CANVAS_HEIGHT, 0x1D2B53) depth -1
    this.add.rectangle(TILE*2, 0, TILE*15, CANVAS_HEIGHT, 0x1D2B53).setOrigin(0).setDepth(-1);
    
    // Right bank (cols 17-19): rectangle(TILE*17,0,TILE*3,CANVAS_HEIGHT, 0x008751) depth -1
    this.add.rectangle(TILE*17, 0, TILE*3, CANVAS_HEIGHT, 0x008751).setOrigin(0).setDepth(-1);
    
    // HUD bar: rectangle(0,0,CANVAS_WIDTH,16, 0x000000) depth 9
    this.add.rectangle(0, 0, CANVAS_WIDTH, 16, 0x000000).setOrigin(0).setDepth(9);
  }

  createLilyPads() {
    for (const pos of this.getLilyPadPositions()) {
      const lilyPad = new LilyPad(this, pos.col, pos.row);
      this.lilyPads.push(lilyPad);
    }
  }

  getLilyPadPositions() {
    return [
      { col: 1, row: 2 },
      { col: 1, row: 4 },
      { col: 1, row: 5 },
      { col: 1, row: 7 },
      { col: 1, row: 9 },
    ];
  }

  createHUD() {
    const style = { fontSize: '8px', fill: '#ffffff', fontFamily: 'monospace' };
    this.hud = {
      hpText:     this.add.text(4,  2, 'HP:',      style).setDepth(10),
      frogsText:  this.add.text(60, 2, 'FROGS:X/10',  style).setDepth(10),
      padsText:   this.add.text(130, 2, 'PADS:X/5',   style).setDepth(10),
      timeText:   this.add.text(200, 2, 'T:XX',     style).setDepth(10),
    };
  }

  update(time, delta) {
    if (this.gameState.gameOver) return;

    // Update gator (input + cooldowns)
    if (this.gator && this.cursors) {
      this.gator.handleInput(this.cursors);
      this.gator.update(delta);
    }

    if (this.frogSpawner) {
      this.frogSpawner.update(delta);
    }

    if (this.logManager) {
      this.logManager.update(delta);
    }

    if (this.collisionSystem && this.gator) {
      this.collisionSystem.checkAll(
        this.gator,
        this.frogSpawner ? this.frogSpawner.frogs : [],
        this.logManager ? this.logManager.getAllLogs() : [],
        this.lilyPads,
        this.gameState
      );
    }

    // Keep gator hp in sync
    this.gameState.hp = this.gator ? this.gator.hp : 0;

    // Update HUD
    if (this.hud) {
      this.hud.hpText.setText(`HP: ${this.gameState.hp}/${MAX_HP}`);
      this.hud.frogsText.setText(`Frogs: ${this.gameState.frogsEaten}/10`);
      this.hud.padsText.setText(`Pads: ${this.gameState.padsFilled}/5`);
      this.hud.timeText.setText(`Time: ${Math.ceil(this.gameState.timeLeft / 1000)}`);
    }

    // Win / lose
    if (this.gameState.win || this.gameState.hp <= 0 || this.gameState.gameOver) {
      this.gameState.gameOver = true;
      this.scene.start('GameOverScene', { gameState: this.gameState });
    }
  }

  updateTimer() {
    if (!this.gameState.gameOver) {
      this.gameState.timeLeft -= 1000;
      this.gameState.score += 1;

      if (this.gameState.timeLeft <= 0) {
        this.gameState.timeLeft = 0;
        this.gameState.gameOver = true;
        this.scene.start('GameOverScene', { gameState: this.gameState });
      }
    }
  }

  // Entity management helpers
  removeFrog(frog) {
    if (this.frogSpawner) {
      this.frogSpawner.removeFrog(frog);
    }
  }

  getFrogs() {
    return this.frogSpawner ? this.frogSpawner.frogs : [];
  }

  getLogs() {
    return this.logManager ? this.logManager.getAllLogs() : [];
  }

  getLilyPads() {
    return this.lilyPads;
  }
}
