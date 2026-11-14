import * as Phaser from 'phaser';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2 - 20, 'PING', {
      fontFamily: 'monospace', fontSize: '48px', color: '#5EF2FF',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 + 30, 'press any key', {
      fontFamily: 'monospace', fontSize: '12px', color: '#E8E8FF',
    }).setOrigin(0.5);

    this.input.keyboard.once('keydown', () => this.scene.start('Game'));
  }
}