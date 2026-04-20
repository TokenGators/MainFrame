import Phaser from 'phaser';
import { C } from '../constants.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('frog', 'assets/frog.png');
    this.load.image('frog_blue', 'assets/frog_blue.png');
    this.load.image('frog_red', 'assets/frog_red.png');
    this.load.image('frog_gold', 'assets/frog_gold.png');
    this.load.image('gator', 'assets/gator.png');

    this.load.on('complete', () => {
      // Wait for Press Start 2P to be available before showing UI
      document.fonts.load("10px 'Press Start 2P'").then(() => {
        this.scene.start('TitleScene');
      }).catch(() => {
        // Font unavailable (offline) — proceed anyway with monospace fallback
        this.scene.start('TitleScene');
      });
    });
  }

  create() {
    // Intentionally empty — transition handled in preload complete callback
  }
}