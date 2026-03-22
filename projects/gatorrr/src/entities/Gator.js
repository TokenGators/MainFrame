import Phaser from 'phaser';
import { C, GATOR_START } from '../constants.js';

export default class Gator extends Phaser.GameObjects.Rectangle {
  constructor(scene, col, row) {
    super(scene, col * 16 + 8, row * 16 + 8, 16, 16);

    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;
    this.hp = 3;
    this.direction = 1; // 1 for right, -1 for left
    this.damageCooldown = 0;
    this.moveCooldown = 0;

    // Set up graphics properties
    this.setFillStyle(C.GREEN);
    this.setOrigin(0.5);

    // Add to scene
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Make sure it's not affected by physics gravity
    this.body.setAllowGravity(false);
  }

  handleInput(cursors) {
    if (this.moveCooldown > 0) return;

    if (Phaser.Input.Keyboard.JustDown(cursors.left) && this.gridCol > 0) {
      this.gridCol--;
      this._applyPos();
    } else if (Phaser.Input.Keyboard.JustDown(cursors.right) && this.gridCol < 19) {
      this.gridCol++;
      this._applyPos();
    } else if (Phaser.Input.Keyboard.JustDown(cursors.up) && this.gridRow > 0) {
      this.gridRow--;
      this._applyPos();
    } else if (Phaser.Input.Keyboard.JustDown(cursors.down) && this.gridRow < 10) {
      this.gridRow++;
      this._applyPos();
    }
  }

  _applyPos() {
    this.x = this.gridCol * 16 + 8;
    this.y = this.gridRow * 16 + 8;
    this.moveCooldown = 150;
  }

  takeDamage() {
    if (this.damageCooldown <= 0) {
      this.hp--;
      this.damageCooldown = 500; // 500ms cooldown

      // Flash red on hit
      this.setFillStyle(C.RED);
      this.scene.time.delayedCall(200, () => {
        this.setFillStyle(C.GREEN); // Restore original color
      });
    }
  }

  getPixelPos() {
    return { x: this.x, y: this.y };
  }

  update(delta) {
    if (this.damageCooldown > 0) {
      this.damageCooldown -= delta;
    }
    if (this.moveCooldown > 0) {
      this.moveCooldown -= delta;
    }
  }
}
