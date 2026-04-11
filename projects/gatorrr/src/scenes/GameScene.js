import Phaser from 'phaser';
import { C, GATOR_START, MAX_HP } from '../constants.js';
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
    // Initialize game state
    this.gameState = {
      hp: MAX_HP,
      frogsEaten: 0,
      padsFilled: 0,
      gameOver: false,
      win: false,
      timeLeft: 60000, // 60 seconds in milliseconds
      score: 0
    };
    
    this.cursors = null;
    this.gator = null;
    this.frogSpawner = null;
    this.logManager = null;
    this.collisionSystem = null;
    this.frogs = [];
    this.logs = [];
    this.lilyPads = [];
    this.hud = null;
  }

  create() {
    // Set up input
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Create the gator at starting position
    this.gator = new Gator(this, GATOR_START.col, GATOR_START.row);
    
    // Create managers
    this.frogSpawner = new FrogSpawner(this);
    this.logManager = new LogColumnManager(this);
    this.collisionSystem = new CollisionSystem(this);
    
    // Create lily pads at their starting positions
    this.createLilyPads();
    
    // Create HUD elements
    this.createHUD();
    
    // Set up game loop
    this.time.addEvent({
      delay: 1000,
      callback: this.updateTimer,
      callbackScope: this,
      loop: true
    });
  }

  createLilyPads() {
    // Create lily pads at their starting positions
    for (const pos of this.getLilyPadPositions()) {
      const lilyPad = new LilyPad(this, pos.col, pos.row);
      this.lilyPads.push(lilyPad);
    }
  }

  getLilyPadPositions() {
    // Return the positions from constants
    return [
      { col: 1, row: 2 },
      { col: 1, row: 4 },
      { col: 1, row: 5 },
      { col: 1, row: 7 },
      { col: 1, row: 9 },
    ];
  }

  createHUD() {
    // Create basic HUD elements
    this.hud = {
      scoreText: this.add.text(10, 10, 'Score: 0', { fontSize: '16px', fill: '#fff' }),
      timeText: this.add.text(10, 30, 'Time: 60', { fontSize: '16px', fill: '#fff' }),
      hpText: this.add.text(10, 50, 'HP: 3', { fontSize: '16px', fill: '#fff' }),
    };
  }

  update(time, delta) {
    // Update game state using delta time for frame-rate independence
    if (this.gameState.gameOver) {
      return;
    }
    
    // Handle gator input
    if (this.gator && this.cursors) {
      this.gator.handleInput(this.cursors);
    }
    
    // Update managers
    if (this.frogSpawner) {
      this.frogSpawner.update(delta);
    }
    
    if (this.logManager) {
      this.logManager.update(delta);
    }
    
    // Check collisions
    if (this.collisionSystem && this.gator) {
      this.collisionSystem.checkAll(
        this.gator,
        this.frogSpawner ? this.frogSpawner.frogs : [],
        this.logManager ? this.logManager.getAllLogs() : [],
        this.lilyPads,
        this.gameState
      );
    }
    
    // Update HUD
    if (this.hud) {
      this.hud.scoreText.setText('Score: ' + this.gameState.score);
      this.hud.timeText.setText('Time: ' + Math.ceil(this.gameState.timeLeft / 1000));
      this.hud.hpText.setText('HP: ' + this.gameState.hp);
    }
    
    // Check win/lose conditions
    if (this.gameState.win || this.gameState.hp <= 0) {
      this.gameState.gameOver = true;
      
      // Show game over screen or restart
      this.scene.start('GameOverScene');
    }
  }

  updateTimer() {
    if (!this.gameState.gameOver) {
      this.gameState.timeLeft -= 1000;
      
      // Add time bonus to score
      this.gameState.score += 1;
      
      // Check if time is up
      if (this.gameState.timeLeft <= 0) {
        this.gameState.timeLeft = 0;
        this.gameState.gameOver = true;
        this.scene.start('GameOverScene');
      }
    }
  }

  // Helper methods for entity management
  addFrog(frog) {
    if (this.frogSpawner && this.frogSpawner.frogs) {
      this.frogSpawner.frogs.push(frog);
    }
  }

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