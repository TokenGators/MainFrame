import Phaser from 'phaser';
import { C, LOG_WIDTH } from '../constants.js';

export default class Log extends Phaser.GameObjects.Rectangle {
  constructor(scene, colIndex, y, heightTiles, speed) {
    super(scene, colIndex * 16 + 8, y, LOG_WIDTH, heightTiles * 16);
    
    this.scene = scene;
    this.colIndex = colIndex;
    this.y = y;
    this.width = LOG_WIDTH;
    this.height = heightTiles * 16;
    this.speed = speed;
    this.gridCol = colIndex;
    
    // Set up graphics properties
    this.setFillStyle(C.BROWN);
    this.setOrigin(0);
    
    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    // Make sure it's not affected by physics gravity
    this.body.setAllowGravity(false);
  }
  
  update(delta) {
    // Move the log vertically
    this.y += this.speed * (delta / 1000);
    
    // Check if off screen and wrap
    if (this.y > 180) {
      this.y = -this.height;
    } else if (this.y < -this.height) {
      this.y = 180;
    }
  }
  
  isOffScreen() {
    return this.y > 180 || this.y < -this.height;
  }
  
  wrap() {
    if (this.y > 180) {
      this.y = -this.height;
    } else if (this.y < -this.height) {
      this.y = 180;
    }
  }
}