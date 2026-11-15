import * as Phaser from 'phaser';
import { loadRoom } from '../systems/RoomLoader.js';
import { recoilFrom } from '../systems/Recoil.js';
import EchoGrid from '../systems/EchoGrid.js';
import EchoSystem from '../systems/EchoSystem.js';
import Bat from '../entities/Bat.js';
import ExitLight from '../entities/ExitLight.js';
import { ROOMS } from '../data/rooms.js';
import { ECHO, FOCUS, EXIT, RESPAWN_MS, CAMERA_ZOOM } from '../config.js';

// Box overlap
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Distance from a point to a box edge
const distToBox = (x, y, r) => {
  const dx = Math.max(r.x - x, 0, x - (r.x + r.w));
  const dy = Math.max(r.y - y, 0, y - (r.y + r.h));
  return Math.hypot(dx, dy);
};

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    // Current room
    this.roomIndex = this.registry.get('room') ?? 0;
    this.roomKey = ROOMS[this.roomIndex];
    this.room = loadRoom(this, this.roomKey);
    const { map, solid, spikes, spawn, exit } = this.room;
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
    this.exitTime = 0;

    // Bat
    this.player = new Bat(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, solid);
    this.shoutKeys = this.input.keyboard.addKeys({ x: 'X', j: 'J' });
    this.holding = false;
    this.holdStart = 0;
    this.nextShout = 0;
    this.nextStep = 0;
    this.wasGrounded = false;

    // Bars above bat: focus (cyan), exit (gold)
    this.focusG = this.add.graphics();
    this.exitG = this.add.graphics();

    // Debug hitboxes, shown with terrain
    this.debugG = this.add.graphics().setVisible(false);

    // Camera follows bat, zoomed in
    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    cam.setZoom(CAMERA_ZOOM);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setDeadzone(40, 24);
    cam.fadeIn(150);

    // Debug: ` terrain, R restart, Esc title
    this.input.keyboard.on('keydown', (e) => {
      if (e.code === 'Backquote') {
        this.terrainVisible = !this.terrainVisible;
        solid.setVisible(this.terrainVisible);
        spikes?.setVisible(this.terrainVisible);
        this.debugG.setVisible(this.terrainVisible);
      }
      if (e.code === 'KeyR') this.scene.restart();
      if (e.code === 'Escape') this.scene.start('Title');
    });
  }

  update(time, delta) {
    if (this.dead || this.leaving) return;
    const p = this.player;
    p.update(time, delta);

    // Shout: tap = normal, hold = focus
    const shoutDown = this.shoutKeys.x.isDown || this.shoutKeys.j.isDown;

    // Started holding
    if (shoutDown && !this.holding && time >= this.nextShout) {
      this.holding = true;
      this.holdStart = time;
    }

    // Charge, 0 to 1, only after holding long enough
    let focusing = false;
    let charge = 0;
    if (this.holding) {
      const held = time - this.holdStart;
      if (held >= FOCUS.HOLD_MS) {
        focusing = true;
        charge = Math.min(1, (held - FOCUS.HOLD_MS) / FOCUS.CHARGE_MS);
      }
    }

    // Let go, shout
    if (this.holding && !shoutDown) {
      this.holding = false;
      this.shout(time, charge);
    }

    this.drawFocus(focusing, charge);

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

    // Debug hitboxes
    if (this.terrainVisible) {
      const d = this.debugG.clear();
      d.lineStyle(1, 0xFF4A5A, 1);
      for (const s of this.room.spikeBoxes) d.strokeRect(s.x, s.y, s.w, s.h);
      d.lineStyle(1, 0x00FF88, 1);
      d.strokeRect(b.x, b.y, b.width, b.height);
      d.lineStyle(1, 0xFFC46B, 1);
      d.strokeRect(this.exitBox.x, this.exitBox.y, this.exitBox.w, this.exitBox.h);
    }

    if (this.room.spikeBoxes.some((s) => overlaps(me, s))) return this.die();

    // Close to exit, reveal it
    if (distToBox(p.x, p.y, this.exitBox) < EXIT.NEAR) this.exitLight.reveal(time);

    // Stay in exit to leave
    if (overlaps(me, this.exitBox)) {
      this.exitTime += delta;
      if (this.exitTime >= EXIT.STAY_MS) return this.nextRoom();
    } else {
      this.exitTime = 0;
    }
    this.drawExitBar();

    // Fell out
    if (p.y > this.room.map.heightInPixels + 32) this.die();
  }

  // Aim direction as an angle
  getAim() {
    const k = this.player.keys;
    let ax = 0;
    let ay = 0;
    if (k.right.isDown || k.d.isDown) ax = 1;
    if (k.left.isDown || k.a.isDown) ax = -1;
    if (k.down.isDown || k.s.isDown) ay = 1;
    if (k.up.isDown || k.w.isDown) ay = -1;

    // Nothing held, face forward
    if (ax === 0 && ay === 0) {
      if (this.player.flipX) return Math.PI;
      return 0;
    }
    return Math.atan2(ay, ax);
  }

  // Shout, charge 0 = normal, 1 = full focus
  shout(time, charge) {
    const p = this.player;
    this.nextShout = time + ECHO.COOLDOWN;
    const aim = this.getAim();

    // Blend from normal to focus by charge
    const cone = ECHO.CONE + (FOCUS.CONE - ECHO.CONE) * charge;
    const range = ECHO.SHOUT_RANGE + (FOCUS.RANGE - ECHO.SHOUT_RANGE) * charge;
    const power = 1 + (FOCUS.RECOIL_MULT - 1) * charge;

    const hits = this.echo.shout(p.x, p.y, aim, cone, range);
    p.shoutPose(time);
    this.checkExit(p, aim, time, cone, range);

    // Recoil, once per air
    // Standing: floor only pushes if aiming down
    const onGround = p.body.blocked.down;
    const aimingDown = Math.sin(aim) > 0.7;
    if (onGround || p.airCharge) {
      const push = recoilFrom(hits, onGround && !aimingDown, power);
      if (push) {
        p.recoil(push, time);
        if (!onGround) p.airCharge = false;
        this.cameras.main.shake(80, 0.003 * power);
      }
    }
  }

  // Focus charge bar above bat, cyan
  drawFocus(focusing, charge) {
    const g = this.focusG.clear();
    if (!focusing) return;
    const x = this.player.x - 8;
    const y = this.player.y - 14;
    g.fillStyle(0x1A1A2E, 0.8);
    g.fillRect(x, y, 16, 3);
    g.fillStyle(0x5EF2FF, 1);
    g.fillRect(x, y, 16 * charge, 3);
  }

  // Exit progress bar, gold
  drawExitBar() {
    const g = this.exitG.clear();
    if (this.exitTime <= 0) return;
    const x = this.player.x - 8;
    const y = this.player.y - 18;
    g.fillStyle(0x1A1A2E, 0.8);
    g.fillRect(x, y, 16, 3);
    g.fillStyle(0xFFC46B, 1);
    g.fillRect(x, y, 16 * Math.min(1, this.exitTime / EXIT.STAY_MS), 3);
  }

  // Exit found by shout/echo
  checkExit(p, aim, time, cone, range) {
    if (this.exitLight.seen) return;
    const { exit } = this.room;
    const dx = exit.x + exit.width / 2 - p.x;
    const dy = exit.y + exit.height / 2 - p.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) return;

    // Inside cone
    const angle = Math.atan2(dy, dx);
    const off = Math.abs(Math.atan2(Math.sin(angle - aim), Math.cos(angle - aim)));
    if (off > (cone * Math.PI) / 360) return;

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