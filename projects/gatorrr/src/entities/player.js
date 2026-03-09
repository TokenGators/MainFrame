/**
 * Player Entity
 * Grid-based movement, 32x32 sprite
 */

import { PLAYER_CONFIG, TILE_SIZE, GRID_WIDTH, GRID_HEIGHT, ZONES } from '../config.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.gridX = PLAYER_CONFIG.startX;
    this.gridY = PLAYER_CONFIG.startY;
    this.tileSize = TILE_SIZE;
    
    // Create rectangle sprite as placeholder (32x32)
    this.sprite = scene.add.rectangle(
      this.getPixelX(),
      this.getPixelY(),
      TILE_SIZE,
      TILE_SIZE,
      0x00FF00  // Green
    );
    this.sprite.setOrigin(0, 0);
    
    // Input handling
    this.setupInput();
    
    // Track if we've reached the goal this turn
    this.reachedGoal = false;
  }
  
  setupInput() {
    const cursors = this.scene.input.keyboard.createCursorKeys();
    const keys = this.scene.input.keyboard.addKeys({
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D'
    });
    
    this.scene.input.keyboard.on('keydown', (event) => {
      const key = event.key.toLowerCase();
      
      if (key === 'arrowup' || key === 'w') {
        this.moveUp();
      } else if (key === 'arrowdown' || key === 's') {
        this.moveDown();
      } else if (key === 'arrowleft' || key === 'a') {
        this.moveLeft();
      } else if (key === 'arrowright' || key === 'd') {
        this.moveRight();
      }
    });
  }
  
  moveUp() {
    if (this.gridY > 0) {
      this.gridY--;
      this.updatePosition();
    }
  }
  
  moveDown() {
    if (this.gridY < GRID_HEIGHT - 1) {
      this.gridY++;
      this.updatePosition();
    }
  }
  
  moveLeft() {
    if (this.gridX > 0) {
      this.gridX--;
      this.updatePosition();
    }
  }
  
  moveRight() {
    if (this.gridX < GRID_WIDTH - 1) {
      this.gridX++;
      this.updatePosition();
    }
  }
  
  updatePosition() {
    this.sprite.setPosition(this.getPixelX(), this.getPixelY());
    
    // Check if reached goal
    if (this.gridY <= ZONES.SAFE_END.y + ZONES.SAFE_END.height - 1) {
      this.reachedGoal = true;
    }
  }
  
  getPixelX() {
    return this.gridX * this.tileSize;
  }
  
  getPixelY() {
    return this.gridY * this.tileSize;
  }
  
  getBounds() {
    return new Phaser.Geom.Rectangle(
      this.getPixelX(),
      this.getPixelY(),
      this.tileSize,
      this.tileSize
    );
  }
  
  reset() {
    this.gridX = PLAYER_CONFIG.startX;
    this.gridY = PLAYER_CONFIG.startY;
    this.reachedGoal = false;
    this.updatePosition();
  }
  
  die() {
    // Visual feedback for death
    this.sprite.setFillStyle(0xFF0000);
    this.scene.time.delayedCall(200, () => {
      this.sprite.setFillStyle(0x00FF00);
    });
  }
}
