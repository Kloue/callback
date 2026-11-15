import * as Phaser from 'phaser';
import { loadRoom } from '../systems/RoomLoader.js';
import { recoilFrom } from '../systems/Recoil.js';
import EchoGrid from '../systems/EchoGrid.js';
import EchoSystem from '../systems/EchoSystem.js';
import Bat from '../entities/Bat.js';
import ExitLight from '../entities/ExitLight.js';
import { ROOMS } from '../data/rooms.js';
import { HEIGHT, ECHO, RESPAWN_MS } from '../config.js';

const JustDown = Phaser.Input.Keyboard.JustDown;

// Box overlap
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    // Current room
    this.roomIndex = this.registry.get('room') ?? 0;
    this.roomKey = ROOMS[this.roomIndex];
    this.room = loadRoom(this, this.roomKey);
    const { solid, spikes, spawn, exit } = this.room;
    this.dead = false;
    this.leaving = false;

    // Hidden terrain, echo reveals stuff
    this.terrainVisible = false;
    solid.setVisible(false);
    spikes?.setVisible(false);

    //echo
    this.grid = new EchoGrid(solid, spikes);
    this.echo = new EchoSystem(this, this.grid);

    // Exit light
    this.exitLight = new ExitLight(this, exit, `exit-${this.roomKey}`);
    this.exitBox = { x: exit.x, y: exit.y, w: exit.width, h: exit.height };

    // Bat
    this.player = new Bat(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, solid);
    this.shoutKeys = this.input.keyboard.addKeys({ x: 'X', j: 'J' });
    this.nextShout = 0;
    this.nextStep = 0;
    this.wasGrounded = false;

    this.cameras.main.fadeIn(150);

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
    if (this.dead || this.leaving) return;
    const p = this.player;
    p.update(time, delta);

    // Shout, aimed (directional)
    const pressed = JustDown(this.shoutKeys.x) || JustDown(this.shoutKeys.j);
    if (pressed && time >= this.nextShout) {
      this.nextShout = time + ECHO.COOLDOWN;
      const k = p.keys;

      // Aim: W/S straight, with ←→ diagonal, none = facing
      const ax = (k.right.isDown || k.d.isDown) ? 1 : (k.left.isDown || k.a.isDown) ? -1 : 0;
      const ay = (k.down.isDown || k.s.isDown) ? 1 : (k.up.isDown || k.w.isDown) ? -1 : 0;
      const aim = ax === 0 && ay === 0 ? (p.flipX ? Math.PI : 0) : Math.atan2(ay, ax);

      const hits = this.echo.shout(p.x, p.y, aim);
      this.checkExit(p, aim, time);
      const onGround = p.body.blocked.down;

      // Recoil, once per air
      if (onGround || p.airCharge) {
        const push = recoilFrom(hits, onGround);
        if (push) {
          p.recoil(push, time);
          if (!onGround) p.airCharge = false;
          this.cameras.main.shake(80, 0.004);
        }
      }
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

    // Spikes, exit
    const b = p.body;
    const me = { x: b.x, y: b.y, w: b.width, h: b.height };
    if (this.room.spikeBoxes.some((s) => overlaps(me, s))) return this.die();
    if (overlaps(me, this.exitBox)) return this.nextRoom();

    // Fell out
    if (p.y > HEIGHT + 32) this.die();
  }

  // Exit found by shout
  checkExit(p, aim, time) {
    if (this.exitLight.seen) return;
    const { exit } = this.room;
    const dx = exit.x + exit.width / 2 - p.x;
    const dy = exit.y + exit.height / 2 - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > ECHO.SHOUT_RANGE) return;

    // Inside cone
    const angle = Math.atan2(dy, dx);
    const off = Math.abs(Math.atan2(Math.sin(angle - aim), Math.cos(angle - aim)));
    if (off > (ECHO.CONE * Math.PI) / 360) return;

    // Not behind rock
    if (this.grid.castRay(p.x, p.y, angle, dist - 8)) return;

    this.exitLight.reveal(time + (dist / ECHO.RING_SPEED) * 1000);
  }

  // Death, quick respawn
  die() {
    this.dead = true;
    this.registry.set('deaths', (this.registry.get('deaths') ?? 0) + 1);
    this.player.body.enable = false;
    this.player.setTint(0xFF4A5A);
    this.cameras.main.shake(150, 0.008);
    this.time.delayedCall(RESPAWN_MS, () => this.scene.restart());
  }

  // Next room, or title after last
  nextRoom() {
    this.leaving = true;
    const next = this.roomIndex + 1;
    this.cameras.main.fadeOut(150);
    this.time.delayedCall(150, () => {
      if (next < ROOMS.length) {
        this.registry.set('room', next);
        this.scene.restart();
      } else {
        this.scene.start('Title');
      }
    });
  }
}