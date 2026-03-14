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
    
    // Preload bitmap font if available; otherwise use Phaser's built-in bitmap text generation
    // this.load.bitmapFont('font', 'assets/font.png', 'assets/font.xml');
  }

  create() {
    // On complete, start GameScene
    this.scene.start('GameScene');
  }
}