import Phaser from 'phaser';
import { C, GATOR_START, TILE, MOVE_DURATION } from '../constants.js';

export default class Gator extends Phaser.GameObjects.Sprite {
  constructor(scene, col, row) {
    super(scene, col * TILE, row * TILE, 'gator');

    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;
    this.hp = 3;
    this.damageCooldown = 0;
    this.moving = false;

    this.setOrigin(0);
    this.setDisplaySize(TILE, TILE);
    this.setDepth(2);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.setSize(TILE, TILE);
  }

  handleInput(cursors) {
    if (this.moving) return; // block input while mid-tween

    let targetCol = this.gridCol;
    let targetRow = this.gridRow;
    let flip = null;

    if (cursors.left.isDown && this.gridCol > 0) {
      targetCol--;
      flip = true;
    } else if (cursors.right.isDown && this.gridCol < 19) {
      targetCol++;
      flip = false;
    } else if (cursors.up.isDown && this.gridRow > 0) {
      targetRow--;
    } else if (cursors.down.isDown && this.gridRow < 10) {
      targetRow++;
    } else {
      return; // no input
    }

    this.gridCol = targetCol;
    this.gridRow = targetRow;
    if (flip !== null) this.setFlipX(flip);
    this.moving = true;

    this.scene.tweens.add({
      targets: this,
      x: this.gridCol * TILE,
      y: this.gridRow * TILE,
      duration: MOVE_DURATION,
      ease: 'Linear',
      onUpdate: () => {
        if (this.body) this.body.reset(this.x, this.y);
      },
      onComplete: () => {
        this.moving = false;
      }
    });
  }

  takeDamage() {
    if (this.damageCooldown <= 0) {
      this.hp--;
      this.damageCooldown = 500;
      this.setTint(0xFF004D);
      this.scene.time.delayedCall(200, () => { this.clearTint(); });
    }
  }

  update(delta) {
    if (this.damageCooldown > 0) this.damageCooldown -= delta;
  }
}
