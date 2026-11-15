import * as Phaser from 'phaser';
import { loadRoom } from '../systems/RoomLoader.js';
import Bat from '../entities/Bat.js';
import EchoGrid from '../systems/EchoGrid.js';
import EchoSystem from '../systems/EchoSystem.js';
import { HEIGHT, ECHO } from '../config.js';
import ExitLight from '../entities/ExitLight.js';
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

    // Exit light
    this.exitLight = new ExitLight(this, exit);

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

    // Shout, aimed (directional)
    const pressed = JustDown(this.shoutKeys.x) || JustDown(this.shoutKeys.j);
    if (pressed && time >= this.nextShout) {
      this.nextShout = time + ECHO.COOLDOWN;
      const k = p.keys;
      const ax = p.flipX ? -1 : 1;
      const ay = (k.down.isDown || k.s.isDown) ? 1 : (k.up.isDown || k.w.isDown) ? -1 : 0;
      const aim = Math.atan2(ay, ax);
      this.echo.shout(p.x, p.y, aim);
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
    this.exitLight.update(time, delta);

    // Fell out
    if (p.y > HEIGHT + 32) this.scene.restart();
  }
}