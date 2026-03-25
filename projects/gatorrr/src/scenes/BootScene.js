import Phaser from 'phaser';
import { C } from '../constants.js';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // No assets to load — entities use Phaser primitives (Rectangles)
    // Sprite assets will be loaded here when art is ready (Cycle B+)
  }

  create() {
    this.scene.start('TitleScene');
  }
}