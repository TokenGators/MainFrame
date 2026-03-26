import Phaser from 'phaser';
import { C, GATOR_START, TILE, MOVE_DURATION, MOVE_HOLD_DELAY } from '../constants.js';

export default class Gator extends Phaser.GameObjects.Sprite {
  constructor(scene, col, row) {
    // Position at center of tile for rotation to work properly
    super(scene, col * TILE + TILE/2, row * TILE + TILE/2, 'gator');

    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;
    this.hp = 3;
    this.damageCooldown = 0;
    this.moving = false;
    this.holdTimer = 0;      // tracks how long current key has been held
    this.lastDir = null;     // last direction key held

    // Set up graphics properties - use center origin for proper rotation
    this.setOrigin(0.5);
    this.setDisplaySize(TILE, TILE);
    this.setDepth(2);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    // Physics body offset compensates for centered origin
    this.body.setSize(TILE, TILE);
    this.body.setOffset(-TILE/2, -TILE/2);
  }

  handleInput(cursors, delta) {
    // Determine which direction (if any) is currently held
    let dir = null;
    if (cursors.left.isDown)       dir = 'left';
    else if (cursors.right.isDown) dir = 'right';
    else if (cursors.up.isDown)    dir = 'up';
    else if (cursors.down.isDown)  dir = 'down';

    // Reset hold timer if direction changed or released
    if (dir !== this.lastDir) {
      this.holdTimer = 0;
      this.lastDir = dir;
    }

    if (!dir) return; // no key held

    const { JustDown } = Phaser.Input.Keyboard;
    const justPressed =
      (dir === 'left'  && JustDown(cursors.left))  ||
      (dir === 'right' && JustDown(cursors.right)) ||
      (dir === 'up'    && JustDown(cursors.up))    ||
      (dir === 'down'  && JustDown(cursors.down));

    // Accumulate hold time
    this.holdTimer += delta;

    // Move on: fresh tap, OR after hold delay while animation is free
    const shouldMove = justPressed || (this.holdTimer >= MOVE_HOLD_DELAY && !this.moving);

    if (!shouldMove || this.moving) return;

    let targetCol = this.gridCol;
    let targetRow = this.gridRow;

    if (dir === 'left' && this.gridCol > 0)       { targetCol--; this.setAngle(0); this.setFlipX(true); }
    else if (dir === 'right' && this.gridCol < 19) { targetCol++; this.setAngle(0); this.setFlipX(false); }
    else if (dir === 'up' && this.gridRow > 0)     { targetRow--; this.setAngle(270); this.setFlipX(false); }
    else if (dir === 'down' && this.gridRow < 10)  { targetRow++; this.setAngle(90); this.setFlipX(false); }
    else return; // at boundary

    this.gridCol = targetCol;
    this.gridRow = targetRow;
    this.moving = true;

    // Tween to center of new tile
    this.scene.tweens.add({
      targets: this,
      x: this.gridCol * TILE + TILE / 2,
      y: this.gridRow * TILE + TILE / 2,
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
      this.setTint(0xFF004D); // Red tint for damage
      this.scene.time.delayedCall(200, () => {
        this.clearTint();
      });
    }
  }

  update(delta) {
    if (this.damageCooldown > 0) this.damageCooldown -= delta;
  }
}
