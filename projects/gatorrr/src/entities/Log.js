import Phaser from 'phaser';
import { C, LOG_WIDTH, TILE, CANVAS_HEIGHT } from '../constants.js';

export default class Log extends Phaser.GameObjects.Rectangle {
  constructor(scene, colIndex, y, heightTiles, speed) {
    const h = heightTiles * TILE;
    super(scene, colIndex * TILE, y, LOG_WIDTH, h);

    this.scene = scene;
    this.colIndex = colIndex;
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
    
    this.setDepth(1);
  }

  update(delta) {
    // Move the log vertically
    this.y += this.speed * (delta / 1000);

    // Wrap when fully off screen
    if (this.y > CANVAS_HEIGHT) {
      this.y = -this.height;
    } else if (this.y + this.height < 0) {
      this.y = CANVAS_HEIGHT;
    }
  }

  isOffScreen() {
    return this.y > CANVAS_HEIGHT || this.y + this.height < 0;
  }
}
