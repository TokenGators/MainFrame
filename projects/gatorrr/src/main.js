import Phaser from 'phaser';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ZOOM } from './constants.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import LevelClearScene from './scenes/LevelClearScene.js';
import LeaderboardScene from './scenes/LeaderboardScene.js';

const config = {
  type: Phaser.AUTO,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  render: {
    pixelArt: true,
    antialias: false,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: ZOOM,
  },
  scene: [BootScene, TitleScene, GameScene, LevelClearScene, GameOverScene, LeaderboardScene],
};

new Phaser.Game(config);
