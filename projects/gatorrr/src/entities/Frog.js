import Phaser from 'phaser';
import { C, FROG_DECISION_INTERVAL, TILE, FROG_TYPES, FROG_SMARTNESS, CANVAS_HEIGHT } from '../constants.js';

export default class Frog extends Phaser.GameObjects.Rectangle {
  constructor(scene, col, row, type = 'green') {
    super(scene, col * TILE, row * TILE, TILE, TILE);

    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;
    this.type = type; // 'green', 'blue', 'purple', 'red', 'gold'
    this.state = 'ON_BANK'; // ON_BANK, ON_LOG, SWIMMING
    this.decisionTimer = 0;
    this.logOffset = 0;
    this.currentLog = null;
    this.swimOffset = 0; // For swimming animation

    // Apply type-specific color
    const color = FROG_TYPES[type].tint;
    this.setFillStyle(color);
    this.setOrigin(0);
    this.setDepth(2);

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Make sure it's not affected by physics gravity
    this.body.setAllowGravity(false);
    this.body.setSize(TILE, TILE);
  }

  update(delta, logs) {
    this.decisionTimer += delta;

    // Handle state-specific behavior
    if (this.state === 'ON_LOG') {
      // Ride the log vertically
      if (this.currentLog) {
        this.y = this.currentLog.y + this.logOffset;
        
        // Check if log wrapped off screen
        if (this.currentLog.y > CANVAS_HEIGHT || this.currentLog.y + this.currentLog.height < 0) {
          // Log wrapped — sync gridCol/x before detaching so frog stays in the river
          this.gridCol = Math.floor(this.x / TILE);
          this.currentLog = null;
          this.state = 'SWIMMING';
        }
      }
    } else if (this.state === 'SWIMMING') {
      // Apply swimming visual effect (70% alpha)
      this.alpha = 0.7;
      
      // Add swimming bobbing animation
      this.swimOffset += delta * 0.01;
      this.y += Math.sin(this.swimOffset) * 0.5;
    } else {
      // ON_BANK - normal appearance
      this.alpha = 1;
    }

    // Make decision on interval (SWIMMING frogs move slower)
    const decisionInterval = this.state === 'SWIMMING' 
      ? FROG_DECISION_INTERVAL * 2 
      : FROG_DECISION_INTERVAL;

    if (this.decisionTimer >= decisionInterval) {
      this.makeDecision(logs);
      this.decisionTimer = 0;
    }
  }

  makeDecision(logs) {
    switch (this.state) {
      case 'ON_BANK':
        this.decideOnBank(logs);
        break;
      case 'ON_LOG':
        this.decideOnLog(logs);
        break;
      case 'SWIMMING':
        this.decideSwimming(logs);
        break;
    }
  }

  decideOnBank(logs) {
    // Check if a log in col 16 overlaps with this frog's row
    const frogY = this.y;
    const logOverlapY = (log) => 
      log.y <= frogY + TILE && log.y + log.height >= frogY - TILE;
    
    for (const log of logs) {
      if (log.gridCol === 16 && logOverlapY(log)) {
        // Found a log to jump onto
        this.state = 'ON_LOG';
        this.currentLog = log;
        this.logOffset = this.y - log.y;
        return;
      }
    }
    // No log found, stay on bank (do nothing)
  }

  decideOnLog(logs) {
    const frogY = this.y;
    const landingZoneCol = this.gridCol - 1;
    
    // Check if a log is in the landing zone (col to left)
    const logOverlapY = (log) => 
      log.y <= frogY + TILE && log.y + log.height >= frogY - TILE;
    
    let logFound = false;
    for (const log of logs) {
      if (log.gridCol === landingZoneCol && logOverlapY(log)) {
        logFound = true;
        break;
      }
    }
    
    // Smart jump (FROG_SMARTNESS) or dumb jump (1 - FROG_SMARTNESS)
    if (logFound) {
      // Log found in landing zone, jump onto it
      for (const log of logs) {
        if (log.gridCol === landingZoneCol && logOverlapY(log)) {
          this.state = 'ON_LOG';
          this.currentLog = log;
          this.gridCol = landingZoneCol;
          this.logOffset = this.y - log.y;
          this.x = this.gridCol * TILE;
          return;
        }
      }
    } else if (Math.random() < (1 - FROG_SMARTNESS)) {
      // No log found but dumb jump - jump into water
      this.state = 'SWIMMING';
      this.gridCol = landingZoneCol;
      this.x = this.gridCol * TILE;
      this.currentLog = null;
    }
    // If log not found and smart, just wait (do nothing)
  }

  decideSwimming(logs) {
    // Move left (slowly - half speed)
    this.gridCol -= 1;
    this.x = this.gridCol * TILE;

    // Check if we can jump onto a log
    const frogY = this.y;
    const logOverlapY = (log) => 
      log.y <= frogY + TILE && log.y + log.height >= frogY - TILE;
    
    for (const log of logs) {
      if (log.gridCol === this.gridCol && logOverlapY(log)) {
        // Jump onto the log
        this.state = 'ON_LOG';
        this.currentLog = log;
        this.logOffset = this.y - log.y;
        return;
      }
    }
  }

  destroy() {
    if (this.currentLog && this.state === 'ON_LOG') {
      this.currentLog = null;
    }
    super.destroy();
  }
}
