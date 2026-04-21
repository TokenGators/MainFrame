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
    this.load.image('logo', 'assets/gatorrr.png');
    this.load.image('coin', 'assets/coin.png');
    this.load.bitmapFont('ps2p', 'assets/ps2p.png', 'assets/ps2p.xml');

    this.load.on('complete', () => {
      this.scene.start('TitleScene');
    });
  }

  create() {
    // Intentionally empty — transition handled in preload complete callback
  }
}