import * as Phaser from 'phaser';
import { ROOMS } from '../data/rooms.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.image('cave', 'assets/tiles/cave.png');
    for (const key of ROOMS) this.load.tilemapTiledJSON(key, `assets/maps/${key}.tmj`);
    this.load.spritesheet('bat', 'assets/sprites/bat.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('crawler', 'assets/sprites/crawler.png', { frameWidth: 16, frameHeight: 16 });

    // Sounds
    for (const s of ['shout', 'echo', 'step', 'land', 'death', 'exit', 'chitter', 'scatter']) {
      this.load.audio(s, `assets/sounds/${s}.wav`);
    }
  }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'click to start', {
      fontFamily: 'monospace', fontSize: '16px', color: '#E8E8FF',
    }).setOrigin(0.5);

    this.input.once('pointerdown', () => this.scene.start('Title'));
  }
}