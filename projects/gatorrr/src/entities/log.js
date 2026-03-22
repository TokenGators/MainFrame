import Phaser from 'phaser';
import { C, LOG_WIDTH } from '../constants.js';

export default class Log extends Phaser.GameObjects.Rectangle {
  constructor(scene, colIndex, y, heightTiles, speed) {
    const h = heightTiles * 16;
    super(scene, colIndex * 16 + 8, y + h / 2, LOG_WIDTH, h);

    this.scene = scene;
    this.colIndex = colIndex;
    this.speed = speed;
    this.gridCol = colIndex;

    // Set up graphics properties
    this.setFillStyle(C.BROWN);
    this.setOrigin(0.5);

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Make sure it's not affected by physics gravity
    this.body.setAllowGravity(false);
  }

  update(delta) {
    // Move the log vertically
    this.y += this.speed * (delta / 1000);

    // Sync physics body
    if (this.body) {
      this.body.reset(this.x, this.y);
    }

    // Check if off screen and wrap
    const h = this.height / 2;
    if (this.y - h > 180) {
      this.y = -h;
    } else if (this.y + h < 0) {
      this.y = 180 + h;
    }
  }

  isOffScreen() {
    const h = this.height / 2;
    return this.y - h > 180 || this.y + h < 0;
  }
}
