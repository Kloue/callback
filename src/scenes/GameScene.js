import * as Phaser from 'phaser';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.add.text(16, 16, 'game scene (Esc to go back)', {
      fontFamily: 'monospace', fontSize: '12px', color: '#E8E8FF',
    });
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('Title'));
  }
}