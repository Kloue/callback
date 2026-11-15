import * as Phaser from 'phaser';
import { ROOMS } from '../data/rooms.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.image('cave', 'assets/tiles/cave.png');
    for (const key of ROOMS) this.load.tilemapTiledJSON(key, `assets/maps/${key}.tmj`);
    this.load.spritesheet('bat', 'assets/sprites/bat.png', { frameWidth: 16, frameHeight: 16 });
  }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'click to start', {
      fontFamily: 'monospace', fontSize: '16px', color: '#E8E8FF',
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => this.scene.start('Title'));
  }
}