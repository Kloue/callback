import * as Phaser from 'phaser';
import { WIDTH, HEIGHT, GRAVITY } from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';

new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: WIDTH,
  height: HEIGHT,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#000000',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: GRAVITY }, debug: false } },
  scene: [BootScene, TitleScene, GameScene],
});