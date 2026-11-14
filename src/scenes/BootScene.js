import * as Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    // maps, sounds and the bat sprite get loaded here later
  }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'click to start', {
      fontFamily: 'monospace', fontSize: '16px', color: '#E8E8FF',
    }).setOrigin(0.5);

    // first click unlocks browser audio and focuses the itch iframe
    this.input.once('pointerdown', () => this.scene.start('Title'));
  }
}