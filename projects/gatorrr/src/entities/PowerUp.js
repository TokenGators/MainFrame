import Phaser from 'phaser';
import { TILE, C, POWERUP_DURATION } from '../constants.js';

export default class PowerUp extends Phaser.GameObjects.Container {
  constructor(scene, col, row) {
    super(scene, col * TILE, row * TILE);
    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;

    // Create the power-up visuals
    // White background
    const bg = this.scene.add.rectangle(TILE / 2, TILE / 2, TILE, TILE, C.WHITE);
    bg.setOrigin(0);

    // Red cross (horizontal)
    const crossWidth = TILE / 3;
    const crossHeight = TILE / 5;
    const horizontal = this.scene.add.rectangle(TILE / 2, TILE / 2, TILE, crossHeight, C.RED);
    horizontal.setOrigin(0.5);

    // Red cross (vertical)
    const vertical = this.scene.add.rectangle(TILE / 2, TILE / 2, crossWidth, TILE, C.RED);
    vertical.setOrigin(0.5);

    // Add to container
    this.add([bg, horizontal, vertical]);

    // Set depth - between background and gator
    this.setDepth(1.5);

    // Add to scene
    this.scene.add.existing(this);
    this.scene.physics.add.existing(this);

    // Make it static (no physics movement)
    this.body.setAllowGravity(false);
    this.body.setSize(TILE, TILE);
    this.body.setOffset(0, 0);

    // Start despawn timer
    this.timer = this.scene.time.delayedCall(POWERUP_DURATION, () => {
      this.destroy();
    });
  }

  destroy() {
    if (this.timer) {
      this.timer.remove();
      this.timer = null;
    }
    super.destroy();
  }

  collect(gator) {
    // Restore HP, capped at MAX_HP
    if (gator.hp < 3) {
      gator.hp += 1;
    }
    // Visual feedback: flash the gator
    this.scene.tweens.add({
      targets: gator,
      alpha: 0.5,
      duration: 50,
      yoyo: true,
      onComplete: () => {
        gator.alpha = 1;
      }
    });
    this.destroy();
  }
}
