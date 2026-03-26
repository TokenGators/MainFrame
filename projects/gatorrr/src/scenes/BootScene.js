import Phaser from 'phaser';
import { C } from '../constants.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('frog', 'assets/frog.png');
    this.load.image('gator', 'assets/gator.png');

    this.load.on('complete', () => {
      this.scene.start('TitleScene');
    });
  }

  create() {
    // Intentionally empty — transition handled in preload complete callback
  }
}