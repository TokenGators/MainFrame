/**
 * Main Game Scene
 * Frogger gameplay loop
 */

import { GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, GRID_HEIGHT, ZONES, GAME_STATES } from '../config.js';
import { Player } from '../entities/player.js';
import { CarManager } from '../entities/car.js';
import { LogManager } from '../entities/log.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }
  
  create() {
    // Initialize game state
    this.gameState = GAME_STATES.PLAYING;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    
    // Create background
    this.createBackground();
    
    // Create player
    this.player = new Player(this);
    
    // Create car manager
    this.carManager = new CarManager(this);
    
    // Create log manager
    this.logManager = new LogManager(this);
    
    // Create UI
    this.createUI();
    
    // Register update handler
    this.events.on('update', this.update, this);
  }
  
  createBackground() {
    // Water/grass pattern
    const safe1 = this.add.rectangle(0, 0, GAME_WIDTH, ZONES.SAFE_START.height * TILE_SIZE, 0x2d5016);
    safe1.setOrigin(0, 0);
    
    const traffic = this.add.rectangle(0, ZONES.TRAFFIC.y * TILE_SIZE, GAME_WIDTH, ZONES.TRAFFIC.height * TILE_SIZE, 0x4a4a4a);
    traffic.setOrigin(0, 0);
    
    const safe2 = this.add.rectangle(0, ZONES.SAFE_END.y * TILE_SIZE, GAME_WIDTH, ZONES.SAFE_END.height * TILE_SIZE, 0x1a3a1a);
    safe2.setOrigin(0, 0);
    
    // Grid lines (optional visual aid)
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    graphics.lineStyle(1, 0x333333, 0.3);
    
    for (let x = 0; x <= GAME_WIDTH; x += TILE_SIZE) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, GAME_HEIGHT);
    }
    for (let y = 0; y <= GAME_HEIGHT; y += TILE_SIZE) {
      graphics.moveTo(0, y);
      graphics.lineTo(GAME_WIDTH, y);
    }
    
    graphics.strokePath();
  }
  
  createUI() {
    this.scoreText = this.add.text(10, 10, `Score: ${this.score}`, {
      fontSize: '20px',
      fill: '#FFFFFF',
      fontFamily: 'Arial'
    });
    
    this.livesText = this.add.text(GAME_WIDTH - 150, 10, `Lives: ${this.lives}`, {
      fontSize: '20px',
      fill: '#FFFFFF',
      fontFamily: 'Arial'
    });
    
    this.levelText = this.add.text(GAME_WIDTH / 2 - 50, 10, `Level: ${this.level}`, {
      fontSize: '20px',
      fill: '#FFFFFF',
      fontFamily: 'Arial'
    });
  }
  
  update(time, deltaTime) {
    if (this.gameState !== GAME_STATES.PLAYING) {
      return;
    }
    
    // Update car positions
    this.carManager.update(deltaTime);
    
    // Check car collision
    const playerBounds = this.player.getBounds();
    if (this.carManager.checkCollision(playerBounds)) {
      this.handlePlayerDeath();
      return;
    }
    
    // Check water collision (drain zone without logs)
    const playerGridY = this.player.gridY;
    const inWaterZone = playerGridY >= ZONES.TRAFFIC.y && playerGridY < ZONES.TRAFFIC.y + ZONES.TRAFFIC.height;
    if (inWaterZone) {
      // For Week 1 MVP, any traffic zone collision that's not a car = death
      // (we'll add logs in Week 2)
      // For now, just check car collision above
    }
    
    // Check win condition
    if (this.player.reachedGoal) {
      this.handleLevelComplete();
    }
  }
  
  handlePlayerDeath() {
    this.player.die();
    this.lives--;
    this.updateUI();
    
    if (this.lives <= 0) {
      this.endGame();
    } else {
      this.time.delayedCall(500, () => {
        this.player.reset();
      });
    }
  }
  
  handleLevelComplete() {
    this.gameState = GAME_STATES.LEVELUP;
    this.score += 100 * this.level;
    this.updateUI();
    
    this.time.delayedCall(1000, () => {
      // For Week 1, just reset the level
      this.level++;
      this.player.reset();
      this.gameState = GAME_STATES.PLAYING;
    });
  }
  
  endGame() {
    this.gameState = GAME_STATES.GAMEOVER;
    
    const gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'GAME OVER', {
      fontSize: '48px',
      fill: '#FF0000',
      fontFamily: 'Arial'
    });
    gameOverText.setOrigin(0.5, 0.5);
    
    const finalScoreText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, `Final Score: ${this.score}`, {
      fontSize: '24px',
      fill: '#FFFFFF',
      fontFamily: 'Arial'
    });
    finalScoreText.setOrigin(0.5, 0.5);
    
    const restartText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 120, 'Press SPACE to restart', {
      fontSize: '18px',
      fill: '#CCCCCC',
      fontFamily: 'Arial'
    });
    restartText.setOrigin(0.5, 0.5);
    
    // Listen for restart
    this.input.keyboard.once('keydown-SPACE', () => {
      this.scene.restart();
    });
  }
  
  updateUI() {
    this.scoreText.setText(`Score: ${this.score}`);
    this.livesText.setText(`Lives: ${this.lives}`);
    this.levelText.setText(`Level: ${this.level}`);
  }
}
