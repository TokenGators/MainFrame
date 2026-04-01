import Phaser from 'phaser';
import { C, GATOR_START, TILE, MOVE_DURATION, MOVE_HOLD_DELAY, DIVE_BREATH_MAX, BITE_START_COUNT } from '../constants.js';

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
    this.holdTimer = 0;       // tracks how long current key has been held
    this.lastDir = null;      // last direction key held
    
     // Cycle E: Entry, Dive, Bite
    this.entered = false;      // false = on bank, true = in river
    this.isDiving = false;     // diving state
    this.breath = DIVE_BREATH_MAX; // current breath
    this.bites = BITE_START_COUNT; // bites remaining
    this.biteArmed = false;    // Shift held state

     // Set up graphics properties - use center origin for proper rotation
    this.setOrigin(0.5);
    this.setDisplaySize(TILE, TILE);
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
       (dir === 'left'   && JustDown(cursors.left))   ||
       (dir === 'right' && JustDown(cursors.right)) ||
       (dir === 'up'     && JustDown(cursors.up))     ||
       (dir === 'down'   && JustDown(cursors.down));

     // Accumulate hold time
    this.holdTimer += delta;

     // Move on: fresh tap, OR after hold delay while animation is free
    const shouldMove = justPressed || (this.holdTimer >= MOVE_HOLD_DELAY && !this.moving);

    if (!shouldMove || this.moving) return;

     // Cycle E1: Entry system - block left/up/down when on bank
    if (!this.entered) {
       // Only allow right movement while on bank
      if (dir !== 'right') return;
       // Move into river, trigger entry
      if (this.gridCol >= 0) {
         this.entered = true;
        this.scene.playEntrySplash(this.x, this.y);
       }
     }

    let targetCol = this.gridCol;
    let targetRow = this.gridRow;

    if (dir === 'left' && this.gridCol > 0)        { targetCol--; this.setAngle(0); this.setFlipX(true); }
    else if (dir === 'right' && this.gridCol < 19) { targetCol++; this.setAngle(0); this.setFlipX(false); }
    else if (dir === 'up' && this.gridRow > 0)      { targetRow--; this.setAngle(270); this.setFlipX(false); }
    else if (dir === 'down' && this.gridRow < 10)   { targetRow++; this.setAngle(90); this.setFlipX(false); }
    else return; // at boundary

     // Cycle E1: Constrain to river once entered
    if (this.entered) {
      if (targetCol < 2) targetCol = 2;
      if (targetCol > 16) targetCol = 16;
     }

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
       // Play damage sound
      this.scene.sound?.play?.('damage');
     }
   }

  update(delta) {
     // Cycle E2: Dive mode
    if (this.isDiving) {
       // Deplete breath
      this.breath -= delta;
      if (this.breath <= 0) {
         // Auto-surface
        this.isDiving = false;
        this.breath = DIVE_BREATH_MAX;
        this.scene.surfaceDive(this);
       }
     } else if (this.entered) {
       // Regen breath while surfaced
      this.breath += delta * 1;
      if (this.breath > DIVE_BREATH_MAX) this.breath = DIVE_BREATH_MAX;
     }

     // Cycle E3: Bite - check for shift + direction
    if (this.biteArmed && this.bites > 0 && !this.isDiving) {
       // Bite will be triggered by GameScene when direction pressed
     }

     // Update cooldown
    if (this.damageCooldown > 0) this.damageCooldown -= delta;
   }

  // Cycle E3: Fire bite in direction
  bite(direction) {
    if (!this.biteArmed || this.bites <= 0 || this.isDiving) return false;

     // Calculate target tile
    let targetCol = this.gridCol;
    let targetRow = this.gridRow;

    if (direction === 'left') targetCol--;
    else if (direction === 'right') targetCol++;
    else if (direction === 'up') targetRow--;
    else if (direction === 'down') targetRow++;

     // Clamp to valid river range
    if (targetCol < 2) targetCol = 2;
    if (targetCol > 16) targetCol = 16;
    if (targetRow < 1) targetRow = 1;
    if (targetRow > 10) targetRow = 10;

     // Consume bite
    this.bites--;
    this.biteArmed = false;

     // Return target for collision resolution
    return { col: targetCol, row: targetRow };
   }
}
