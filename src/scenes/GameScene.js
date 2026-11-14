import * as Phaser from 'phaser';
import { loadRoom } from '../systems/RoomLoader.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.room = loadRoom(this, 'test');
    const { solid, spikes, spawn, exit } = this.room;

    // the shipped game never shows terrain; the echo system will reveal it
    this.terrainVisible = false;
    solid.setVisible(false);
    spikes?.setVisible(false);

    // exit marker (becomes a pulse later)
    this.add.rectangle(exit.x + exit.width / 2, exit.y + exit.height / 2, exit.width, exit.height)
      .setStrokeStyle(1, 0x5EF2FF, 0.4);

    // placeholder bat: a 10 x 12 box that falls under gravity
    this.player = this.add.rectangle(spawn.x, spawn.y, 10, 12, 0xE8E8FF);
    this.physics.add.existing(this.player);
    this.physics.add.collider(this.player, solid);

    // debug keys
    this.input.keyboard.on('keydown', (e) => {
      if (e.code === 'Backquote') {
        this.terrainVisible = !this.terrainVisible;
        solid.setVisible(this.terrainVisible);
        spikes?.setVisible(this.terrainVisible);
      }
      if (e.code === 'KeyR') this.scene.restart();
      if (e.code === 'Escape') this.scene.start('Title');
    });
  }
}