/**
 * Log Entity
 * Moving obstacles in water zones that the player can ride
 */

import { LOG_CONFIG, TILE_SIZE, GAME_WIDTH } from '../config.js';

export class Log {
  constructor(scene, startX, startY, speed, direction) {
    this.scene = scene;
    this.x = startX;
    this.y = startY;
    this.speed = speed;
    this.direction = direction; // 1 for RIGHT, -1 for LEFT
    this.width = LOG_CONFIG.width;
    this.height = LOG_CONFIG.height;
    
    // Create rectangle sprite for log
    this.sprite = scene.add.rectangle(
      this.x,
      this.y,
      this.width,
      this.height,
      LOG_CONFIG.color
    );
    this.sprite.setOrigin(0, 0);
  }
  
  update(deltaTime) {
    this.x += (this.speed * this.direction * deltaTime) / 1000;
    
    // Wrap around screen
    if (this.direction > 0) {
      // Moving right, wrap from left
      if (this.x > GAME_WIDTH) {
        this.x = -this.width;
      }
    } else {
      // Moving left, wrap from right
      if (this.x < -this.width) {
        this.x = GAME_WIDTH;
      }
    }
    
    this.sprite.setPosition(this.x, this.y);
  }
  
  getBounds() {
    return new Phaser.Geom.Rectangle(
      this.x,
      this.y,
      this.width,
      this.height
    );
  }
  
  getGridY() {
    return Math.floor(this.y / TILE_SIZE);
  }
}

export class LogManager {
  constructor(scene) {
    this.scene = scene;
    this.logs = [];
    this.rowDirections = {}; // Maps grid row to direction (1 or -1)
    this.setupLogs();
  }
  
  setupLogs() {
    // Water zones: rows 3-12 (10 rows total)
    // Alternating pattern: odd rows go RIGHT (1), even rows go LEFT (-1)
    
    const waterStartRow = 3;
    const waterEndRow = 13;
    
    // Assign direction to each row (alternating pattern)
    for (let row = waterStartRow; row < waterEndRow; row++) {
      // Alternating: row 3 = RIGHT, row 4 = LEFT, row 5 = RIGHT, etc.
      this.rowDirections[row] = (row % 2 === 1) ? 1 : -1;
    }
    
    // Spawn logs in each water row
    for (let row = waterStartRow; row < waterEndRow; row++) {
      const laneY = row * TILE_SIZE;
      const direction = this.rowDirections[row];
      
      // Spawn 3-4 logs per row, spaced out
      const logsPerRow = 3;
      for (let i = 0; i < logsPerRow; i++) {
        const startX = i * 350; // Spacing
        const log = new Log(this.scene, startX, laneY, LOG_CONFIG.speed, direction);
        this.logs.push(log);
      }
    }
  }
  
  update(deltaTime) {
    for (let log of this.logs) {
      log.update(deltaTime);
    }
  }
  
  checkCollision(playerBounds) {
    for (let log of this.logs) {
      const logBounds = log.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, logBounds)) {
        return true;
      }
    }
    return false;
  }

  // Check if player is on a log and get the log's movement
  getLogMovement(playerBounds) {
    for (let log of this.logs) {
      const logBounds = log.getBounds();
      if (Phaser.Geom.Rectangle.Overlaps(playerBounds, logBounds)) {
        // Return the movement vector for this frame
        return {
          hasLog: true,
          direction: log.direction,
          speed: log.speed
        };
      }
    }
    return { hasLog: false };
  }
}
