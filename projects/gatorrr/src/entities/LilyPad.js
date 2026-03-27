import Phaser from 'phaser';
import { C, TILE } from '../constants.js';

export default class LilyPad extends Phaser.GameObjects.Rectangle {
  constructor(scene, col, row) {
    super(scene, col * TILE, row * TILE, TILE, TILE);

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
    
    this.setDepth(1);
  }

  fill() {
    this.filled = true;
    this.setFillStyle(C.DARK_RED);

    // Add a brief scale pulse
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.4,
      scaleY: 1.4,
      duration: 100,
      yoyo: true,
      ease: 'Power2'
    });
  }

  getPixelPos() {
    return { x: this.x, y: this.y };
  }
}
