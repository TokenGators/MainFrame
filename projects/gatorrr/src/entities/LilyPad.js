import Phaser from 'phaser';
import { C } from '../constants.js';

export default class LilyPad extends Phaser.GameObjects.Rectangle {
  constructor(scene, col, row) {
    super(scene, col * 16, row * 16, 16, 16);

    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;
    this.filled = false;

    // Set up graphics properties
    this.setFillStyle(C.DARK_GREEN);
    this.setOrigin(0);

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Make sure it's not affected by physics gravity
    this.body.setAllowGravity(false);
  }

  fill() {
    this.filled = true;
    this.setFillStyle(C.DARK_RED);
  }

  getPixelPos() {
    return { x: this.x, y: this.y };
  }
}
