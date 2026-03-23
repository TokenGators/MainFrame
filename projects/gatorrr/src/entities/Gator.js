import Phaser from 'phaser';
import { C, GATOR_START, TILE } from '../constants.js';

export default class Gator extends Phaser.GameObjects.Sprite {
  constructor(scene, col, row) {
    super(scene, col * TILE, row * TILE, 'gator');

    this.scene = scene;
    this.gridCol = col;
    this.gridRow = row;
    this.hp = 3;
    this.damageCooldown = 0;
    this.moveCooldown = 0;

    this.setOrigin(0);
    this.setDisplaySize(TILE, TILE);
    this.setDepth(2);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.body.setSize(TILE, TILE);
  }

  handleInput(cursors) {
    if (this.moveCooldown > 0) return;
    if (Phaser.Input.Keyboard.JustDown(cursors.left) && this.gridCol > 0) { 
      this.gridCol--;
      this.setFlipX(true);   // face left
      this._applyPos(); 
    }
    else if (Phaser.Input.Keyboard.JustDown(cursors.right) && this.gridCol < 19) { 
      this.gridCol++;
      this.setFlipX(false);  // face right (default)
      this._applyPos(); 
    }
    else if (Phaser.Input.Keyboard.JustDown(cursors.up) && this.gridRow > 0) { 
      this.gridRow--;
      this._applyPos(); 
    }
    else if (Phaser.Input.Keyboard.JustDown(cursors.down) && this.gridRow < 10) { 
      this.gridRow++;
      this._applyPos(); 
    }
  }

  _applyPos() {
    this.x = this.gridCol * TILE;
    this.y = this.gridRow * TILE;
    this.moveCooldown = 150;
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
    if (this.moveCooldown > 0) this.moveCooldown -= delta;
  }
}
