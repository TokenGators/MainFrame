import Phaser from 'phaser';
import { POPUP_FLOAT_DISTANCE, POPUP_DURATION } from '../constants.js';

export default class ScorePopup {
  constructor(scene, x, y, points, color) {
    this.scene = scene;

    // Convert hex color to CSS string
    const colorStr = '#' + color.toString(16).padStart(6, '0');

    // Create text at position
    this.text = this.scene.add.text(x, y, points.toString(), {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: colorStr,
      stroke: '#000000',
      strokeThickness: 2
    });

    this.text.setOrigin(0.5);
    this.text.setDepth(20);

    // Float up and fade out
    this.scene.tweens.add({
      targets: this.text,
      y: y - POPUP_FLOAT_DISTANCE,
      alpha: 0,
      duration: POPUP_DURATION,
      ease: 'Power2',
      onComplete: () => {
        this.text.destroy();
      }
    });
  }
}
