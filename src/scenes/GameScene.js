import * as Phaser from 'phaser';
import { loadRoom } from '../systems/RoomLoader.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.room = loadRoom(this, 'test');
    const { solid, spikes, spawn, exit } = this.room;

    // Hidden terrain, echo reveals
    this.terrainVisible = false;
    solid.setVisible(false);
    spikes?.setVisible(false);

    // Exit outline
    this.add.rectangle(exit.x + exit.width / 2, exit.y + exit.height / 2, exit.width, exit.height)
      .setStrokeStyle(1, 0x5EF2FF, 0.4);

    // Placeholder box
    this.player = this.add.rectangle(spawn.x, spawn.y, 10, 12, 0xE8E8FF);
    this.physics.add.existing(this.player);
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
}