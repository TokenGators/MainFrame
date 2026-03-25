import Phaser from 'phaser';
import { C, GATOR_START, TILE, MOVE_DURATION, MOVE_HOLD_DELAY } from '../constants.js';

export default class Gator extends Phaser.GameObjects.Rectangle {
  constructor(scene, col, row) {
    super(scene, col * TILE, row * TILE, TILE, TILE);

    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;
    this.hp = 3;
    this.damageCooldown = 0;
    this.moving = false;
    this.holdTimer = 0;      // tracks how long current key has been held
    this.lastDir = null;     // last direction key held

    this.setFillStyle(C.GREEN);
    this.setOrigin(0);
    this.setDepth(2);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.setSize(TILE, TILE);
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
    let flip = null;

    if (dir === 'left' && this.gridCol > 0)       { targetCol--; flip = true; }
    else if (dir === 'right' && this.gridCol < 19) { targetCol++; flip = false; }
    else if (dir === 'up' && this.gridRow > 0)     { targetRow--; }
    else if (dir === 'down' && this.gridRow < 10)  { targetRow++; }
    else return; // at boundary

    this.gridCol = targetCol;
    this.gridRow = targetRow;
    // flip: reserved for when sprite art is added
    this.moving = true;
    // Reset hold timer so next repeat waits another delay
    this.holdTimer = 0;

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
      this.setFillStyle(C.RED);
      this.scene.time.delayedCall(200, () => { this.setFillStyle(C.GREEN); });
    }
  }

  update(delta) {
    if (this.damageCooldown > 0) this.damageCooldown -= delta;
  }
}
