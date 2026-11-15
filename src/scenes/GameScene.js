import * as Phaser from 'phaser';
import { loadRoom } from '../systems/RoomLoader.js';
import Bat from '../entities/Bat.js';
import EchoGrid from '../systems/EchoGrid.js';
import EchoSystem from '../systems/EchoSystem.js';
import { HEIGHT, ECHO } from '../config.js';
const JustDown = Phaser.Input.Keyboard.JustDown;

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.room = loadRoom(this, 'test');
    const { solid, spikes, spawn, exit } = this.room;

    // Hidden terrain, echo reveals stuff
    this.terrainVisible = false;
    solid.setVisible(false);
    spikes?.setVisible(false);

    //echo
    this.echo = new EchoSystem(this, new EchoGrid(solid, spikes));

    // Exit outline 
    this.add.rectangle(exit.x + exit.width / 2, exit.y + exit.height / 2, exit.width, exit.height)
      .setStrokeStyle(1, 0x5EF2FF, 0.4);

    // Bat
    this.player = new Bat(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, solid);
    this.shoutKeys = this.input.keyboard.addKeys({ x: 'X', j: 'J' });
    this.nextShout = 0;
    this.nextStep = 0;
    this.wasGrounded = false;

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
    const p = this.player;
    p.update(time, delta);

    // Shout
    const pressed = JustDown(this.shoutKeys.x) || JustDown(this.shoutKeys.j);
    if (pressed && time >= this.nextShout) {
      this.nextShout = time + ECHO.COOLDOWN;
      this.echo.shout(p.x, p.y);
    }

    // Footsteps, landing
    const grounded = p.body.blocked.down;
    if (grounded && !this.wasGrounded) this.echo.smallPing(p.x, p.y + 4);
    if (grounded && Math.abs(p.body.velocity.x) > 20 && time >= this.nextStep) {
      this.nextStep = time + 250;
      this.echo.smallPing(p.x, p.y + 4);
    }
    this.wasGrounded = grounded;

    this.echo.update(time);

    // Fell out
    if (p.y > HEIGHT + 32) this.scene.restart();
  }
}