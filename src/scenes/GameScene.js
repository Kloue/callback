import * as Phaser from 'phaser';
import { loadRoom } from '../systems/RoomLoader.js';
import Bat from '../entities/Bat.js';
import { HEIGHT } from '../config.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.room = loadRoom(this, 'test');
    const { solid, spikes, spawn, exit } = this.room;

    // Hidden terrain, echo reveals stuff
    this.terrainVisible = false;
    solid.setVisible(false);
    spikes?.setVisible(false);

    // Exit outline 
    this.add.rectangle(exit.x + exit.width / 2, exit.y + exit.height / 2, exit.width, exit.height)
      .setStrokeStyle(1, 0x5EF2FF, 0.4);

    // Bat
    this.player = new Bat(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, solid);

    // Debug: ` terrain, R restart, Esc title
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

  update(time, delta) {
    this.player.update(time, delta);

    // Fell out
    if (this.player.y > HEIGHT + 32) this.scene.restart();
  }
}