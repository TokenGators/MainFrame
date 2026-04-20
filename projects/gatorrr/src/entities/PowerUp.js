import Phaser from 'phaser';
import { TILE, C, POWERUP_DURATION } from '../constants.js';

// Pill dimensions (fits within one TILE cell, centered)
const PILL_W  = 18; // total pill width
const PILL_H  = 8;  // total pill height
const HALF_W  = PILL_W / 2; // 9px per capsule half
const BORDER  = 1;  // dark outline thickness

export default class PowerUp extends Phaser.GameObjects.Container {
  constructor(scene, col, row) {
    super(scene, col * TILE + TILE / 2, row * TILE + TILE / 2);
    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;

    // --- Pill capsule ---
    // Dark outline/shadow behind the whole pill
    const outline = scene.add.rectangle(0, 0, PILL_W + BORDER * 2, PILL_H + BORDER * 2, C.BLACK)
      .setOrigin(0.5);

    // Left half: red
    const leftHalf = scene.add.rectangle(-HALF_W / 2, 0, HALF_W, PILL_H, C.RED)
      .setOrigin(0.5);

    // Right half: cream/white
    const rightHalf = scene.add.rectangle(HALF_W / 2, 0, HALF_W, PILL_H, C.WHITE)
      .setOrigin(0.5);

    // Centre divider line (1px dark)
    const divider = scene.add.rectangle(0, 0, 1, PILL_H, C.BLACK)
      .setOrigin(0.5);

    // Highlight dot on red half (top-left shine)
    const shine = scene.add.rectangle(-HALF_W / 2 - 1, -2, 2, 2, C.PINK)
      .setOrigin(0.5);

    this.add([outline, leftHalf, rightHalf, divider, shine]);

    this.setDepth(1.5);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.setSize(TILE, TILE);
    this.body.setOffset(-TILE / 2, -TILE / 2);

    // Gentle bob tween
    this.tweens.add({
      targets: this,
      y: this.y - 2,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Despawn timer
    this.timer = scene.time.delayedCall(POWERUP_DURATION, () => {
      // Blink warning in final 2s
      this.tweens.add({
        targets: this,
        alpha: 0,
        duration: 120,
        yoyo: true,
        repeat: 7,
        onComplete: () => { this.destroy(); },
      });
    });
  }

  destroy(fromScene) {
    if (this.timer) { this.timer.remove(); this.timer = null; }
    super.destroy(fromScene);
  }

  collect(gator) {
    if (gator.hp < 3) {
      gator.hp += 1;
    }
    // Yellow flash on gator
    gator.setTint(0xFFEC27);
    this.scene.time.delayedCall(150, () => {
      if (gator && gator.active) gator.clearTint();
    });
    // Pop + fade the pill
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => { this.destroy(); },
    });
    if (this.timer) { this.timer.remove(); this.timer = null; }
  }
}
