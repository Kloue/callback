import * as Phaser from 'phaser';
import Bat from '../entities/Bat.js';

// Control cards: keys, what they do
const CARDS = [
  ['← →   or   A D', 'move'],
  ['Space', 'jump · hold it to go higher'],
  ['X   or   J', 'shout · your echo shows the walls'],
  ['W A S D   or   arrows', 'hold any direction while you shout to aim'],
  ['hold X   or   J', 'focus · a longer, stronger shout'],
  ['', "the rest, you'll learn down there."],
];

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    const { width, height } = this.scale;

    // Title, lit by the echo
    this.title = this.add.text(width / 2, height / 2 - 50, 'PING', {
      fontFamily: 'monospace', fontSize: '64px', color: '#5EF2FF',
    }).setOrigin(0.5);
    this.sub = this.add.text(width / 2, height / 2 + 2, 'a bat, a broken wing, and an echo', {
      fontFamily: 'monospace', fontSize: '10px', color: '#8A8AB0',
    }).setOrigin(0.5);

    // Bat, idle
    Bat.createAnims(this);
    this.bat = this.add.sprite(width / 2, height / 2 + 50, 'bat', 0).setScale(3).play('bat-idle');

    this.prompt = this.add.text(width / 2, height - 40, 'press any key', {
      fontFamily: 'monospace', fontSize: '12px', color: '#E8E8FF',
    }).setOrigin(0.5);

    // Echo rings from the bat
    this.rings = this.add.graphics();
    this.nextRing = 0;
    this.ringStart = -9999;

    // Cards, hidden until a key
    this.keyText = this.add.text(width / 2, height / 2 - 20, '', {
      fontFamily: 'monospace', fontSize: '28px', color: '#5EF2FF',
    }).setOrigin(0.5).setVisible(false);
    this.doText = this.add.text(width / 2, height / 2 + 24, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#E8E8FF',
    }).setOrigin(0.5).setVisible(false);
    this.cardHelp = this.add.text(width / 2, height - 24, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#5A5A7A',
    }).setOrigin(0.5).setVisible(false);

    this.card = -1;
    this.starting = false;
    this.ready = false;
    this.time.delayedCall(300, () => { this.ready = true; });

    this.input.keyboard.on('keydown', (e) => this.press(e.code));
    this.input.on('pointerdown', () => { if (this.card === -1) this.press('Click'); });
    this.cameras.main.fadeIn(400);
  }

  // Title --> cards (arrows only) --> game
  press(code) {
    if (!this.ready) return;

    // Any key leaves the title
    if (this.card === -1) {
      this.title.setVisible(false);
      this.sub.setVisible(false);
      this.prompt.setVisible(false);
      this.bat.setY(this.scale.height / 2 - 90).setScale(2);
      this.keyText.setVisible(true);
      this.doText.setVisible(true);
      this.cardHelp.setVisible(true);
      return this.showCard(0);
    }

    // Cards: → next, ← back, Esc skip
    if (code === 'ArrowRight') {
      if (this.card === CARDS.length - 1) return this.startRun();
      this.showCard(this.card + 1);
    }
    if (code === 'ArrowLeft' && this.card > 0) this.showCard(this.card - 1);
    if (code === 'Escape') this.startRun();
  }

  showCard(n) {
    this.card = n;
    const [keys, what] = CARDS[n];
    this.keyText.setText(keys).setAlpha(0);
    this.doText.setText(what).setAlpha(0);
    this.tweens.add({ targets: [this.keyText, this.doText], alpha: 1, duration: 300 });

    // Help line, last card starts
    const last = n === CARDS.length - 1;
    const back = n > 0 ? '← back · ' : '';
    this.cardHelp.setText(`${back}→ ${last ? 'start' : 'next'} · Esc skip   ${n + 1}/${CARDS.length}`);
  }

  // a new run
  startRun() {
    if (this.starting) return;
    this.starting = true;
    this.registry.reset();
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => this.scene.start('Game'));
  }

  update(time) {
    // New ring every 1.6 s, bat does its shout pose
    if (time >= this.nextRing) {
      this.nextRing = time + 1600;
      this.ringStart = time;
      this.bat.anims.stop();
      this.bat.setFrame(6);
      this.time.delayedCall(150, () => this.bat.play('bat-idle'));
    }

    const r = ((time - this.ringStart) / 1000) * 260;
    const g = this.rings.clear();
    if (r < 320) {
      const k = r / 320;
      g.lineStyle(2, 0xE8E8FF, 0.6 * (1 - k));
      g.strokeCircle(this.bat.x, this.bat.y, r);
    }

    // Title glows when the ring passes it
    const d = Math.abs(this.bat.y - this.title.y);
    const hit = Math.exp(-(((r - d) / 40) ** 2));
    this.title.setAlpha(0.3 + 0.7 * hit);
    this.prompt.setAlpha(0.5 + 0.5 * Math.sin(time / 300));
  }
}