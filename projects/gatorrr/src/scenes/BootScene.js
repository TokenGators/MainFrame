import Phaser from 'phaser';
import { C } from '../constants.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Preload sprite assets (frog.png, gator.png, lily_pad.png from `assets/`)
    this.load.image('frog', 'assets/frog.png');
    this.load.image('gator', 'assets/gator.png');
    this.load.image('lily_pad', 'assets/lily_pad.png');

    // Transition to TitleScene only after all assets are loaded
    this.load.on('complete', () => {
      this.scene.start('TitleScene');
    });
  }

  create() {
    // Intentionally empty — transition handled in preload complete callback
  }
}