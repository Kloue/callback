import * as Phaser from 'phaser';
import { STORY } from '../data/rooms.js';

export default class StoryScene extends Phaser.Scene {
  constructor() { super('Story'); }

  init(data) {
    this.cards = STORY[data.key] ?? [];
    this.index = -1;
  }

  create() {
    const { width, height } = this.scale;
    this.text = this.add.text(width / 2, height / 2, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#E8E8FF', align: 'center', lineSpacing: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, height - 24, 'any key', {
      fontFamily: 'monospace', fontSize: '10px', color: '#5A5A7A',
    }).setOrigin(0.5);

    // Short wait, held keys don't skip
    this.ready = false;
    this.time.delayedCall(400, () => { this.ready = true; });
    this.input.keyboard.on('keydown', () => this.next());
    this.input.on('pointerdown', () => this.next());

    this.cameras.main.fadeIn(300);
    this.next(true);
  }

  // Next card, or leave
  next(first) {
    if (!first && !this.ready) return;
    this.ready = false;
    this.time.delayedCall(250, () => { this.ready = true; });

    this.index += 1;
    if (this.index >= this.cards.length) return this.done();

    const deaths = this.registry.get('deaths') ?? 0;
    const line = this.cards[this.index].replace('{deaths}', deaths);
    const gold = line.startsWith('STAGE');
    this.text.setText(line).setColor(gold ? '#FFC46B' : '#E8E8FF').setAlpha(0);
    this.tweens.add({ targets: this.text, alpha: 1, duration: 400 });
  }

  done() {
    // Finished the game, back to title
    if (this.registry.get('room') === 'end') return this.scene.start('Title');
    this.scene.start('Game');
  }
}