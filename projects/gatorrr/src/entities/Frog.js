import Phaser from 'phaser';
import { C, FROG_DECISION_INTERVAL, FROG_JUMP_CHANCE, TILE } from '../constants.js';

export default class Frog extends Phaser.GameObjects.Sprite {
  constructor(scene, col, row) {
    super(scene, col * TILE, row * TILE, 'frog');

    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;
    this.state = 'SWIMMING'; // SWIMMING, ON_LOG, VULNERABLE
    this.decisionTimer = 0;
    this.onLogId = null;
    this.timeOnLog = 0;

    // Set up graphics properties
    this.setOrigin(0);
    this.setDisplaySize(TILE, TILE);
    this.setDepth(2);

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Make sure it's not affected by physics gravity
    this.body.setAllowGravity(false);
    this.body.setSize(TILE, TILE);
    
    // Keep all existing state/AI properties and makeDecision() logic
  }

  update(delta, logs) {
    this.decisionTimer += delta;

    if (this.decisionTimer >= FROG_DECISION_INTERVAL) {
      this.makeDecision(logs);
      this.decisionTimer = 0;
    }

    // Update time on log
    if (this.state === 'ON_LOG') {
      this.timeOnLog += delta;
    }
  }

  makeDecision(logs) {
    // Only move if not in vulnerable state
    if (this.state === 'VULNERABLE') {
      return;
    }

    // 70% left / 15% up / 15% down directional bias
    const rand = Math.random();
    let direction = null;
    
    if (rand < 0.7) {
      // Move left (70% chance)
      direction = 'LEFT';
    } else if (rand < 0.85) {
      // Move up (15% chance)
      direction = 'UP';
    } else {
      // Move down (15% chance)
      direction = 'DOWN';
    }

    const possibleMoves = [];

    // Check possible moves based on direction
    if (direction === 'UP' && this.gridRow > 1) {
      possibleMoves.push({ dir: 'UP', col: this.gridCol, row: this.gridRow - 1 });
    } else if (direction === 'DOWN' && this.gridRow < 10) {
      possibleMoves.push({ dir: 'DOWN', col: this.gridCol, row: this.gridRow + 1 });
    } else if (direction === 'LEFT' && this.gridCol > 1) { // Fixed: now can't go to col 0
      possibleMoves.push({ dir: 'LEFT', col: this.gridCol - 1, row: this.gridRow });
    }

    // If there are valid moves, make one
    if (possibleMoves.length > 0) {
      const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

      // Update grid position
      this.gridCol = move.col;
      this.gridRow = move.row;

      // Update pixel position
      this.x = this.gridCol * TILE;
      this.y = this.gridRow * TILE;

      // Check if we're on a log
      let onLog = false;
      for (const log of logs) {
        if (log.gridCol === this.gridCol &&
            log.y <= this.y &&
            log.y + log.height >= this.y) {
          this.state = 'ON_LOG';
          this.onLogId = log.id;
          onLog = true;
          break;
        }
      }

      if (!onLog) {
        this.state = 'SWIMMING';
      }
    }
  }

  destroy() {
    super.destroy();
  }
}
