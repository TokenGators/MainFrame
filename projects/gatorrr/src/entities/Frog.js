import Phaser from 'phaser';
import { C, FROG_DECISION_INTERVAL, FROG_JUMP_CHANCE } from '../constants.js';

export default class Frog extends Phaser.GameObjects.Rectangle {
  constructor(scene, col, row) {
    super(scene, col * 16 + 8, row * 16 + 8, 16, 16);

    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;
    this.state = 'SWIMMING'; // SWIMMING, ON_LOG, VULNERABLE
    this.decisionTimer = 0;
    this.onLogId = null;
    this.timeOnLog = 0;

    // Set up graphics properties
    this.setFillStyle(C.RED);
    this.setOrigin(0.5);

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Make sure it's not affected by physics gravity
    this.body.setAllowGravity(false);
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

    // 60% chance to jump, 40% chance to wait
    if (Math.random() < FROG_JUMP_CHANCE) {
      const possibleMoves = [];

      // Check possible moves: UP, DOWN, LEFT (frogs move left toward lily pads)
      if (this.gridRow > 1) possibleMoves.push({ dir: 'UP', col: this.gridCol, row: this.gridRow - 1 });
      if (this.gridRow < 10) possibleMoves.push({ dir: 'DOWN', col: this.gridCol, row: this.gridRow + 1 });
      if (this.gridCol > 0) possibleMoves.push({ dir: 'LEFT', col: this.gridCol - 1, row: this.gridRow });

      // If there are valid moves, make one
      if (possibleMoves.length > 0) {
        const move = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

        // Update grid position
        this.gridCol = move.col;
        this.gridRow = move.row;

        // Update pixel position
        this.x = this.gridCol * 16 + 8;
        this.y = this.gridRow * 16 + 8;

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
  }

  destroy() {
    super.destroy();
  }
}
