import * as Phaser from 'phaser';
import { loadRoom } from '../systems/RoomLoader.js';
import { recoilFrom } from '../systems/Recoil.js';
import EchoGrid from '../systems/EchoGrid.js';
import EchoSystem from '../systems/EchoSystem.js';
import Bat from '../entities/Bat.js';
import ExitLight from '../entities/ExitLight.js';
import { ROOMS } from '../data/rooms.js';
import Crawler, { wallCells } from '../entities/Crawler.js';
import { ECHO, FOCUS, EXIT, CRAWLER, RECOIL, RESPAWN_MS, CAMERA_ZOOM, TILE } from '../config.js';

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
    // Current room, entry point (first room if new run)
    this.roomKey = this.registry.get('room') ?? ROOMS[0];
    this.room = loadRoom(this, this.roomKey);
    const { map, solid, spikes } = this.room;
    const spawn = this.room.find(this.registry.get('entry') ?? 'spawn') ?? this.room.spawn;
    this.dead = false;
    this.leaving = false;

    // Hidden terrain, echo reveals stuff
    this.terrainVisible = false;
    solid.setVisible(false);
    spikes?.setVisible(false);

    //echo
    this.grid = new EchoGrid(solid, spikes);
    this.echo = new EchoSystem(this, this.grid);

    // Exits, each with its own light
    this.exits = this.room.exits.map((e) => ({
      ...e,
      box: { x: e.x, y: e.y, w: e.width, h: e.height },
      light: new ExitLight(this, e, `exit-${this.roomKey}-${e.id}`),
    }));
    this.exitTime = 0;

    // Crawlers, random spots on the walls, not near the start
    this.crawlers = [];
    const count = this.room.props.crawlers ?? 0;
    const cells = wallCells(this.grid).filter(([cx, cy]) =>
      Math.hypot(cx * TILE + 8 - spawn.x, cy * TILE + 8 - spawn.y) > CRAWLER.SAFE);
    for (let i = 0; i < count && cells.length > 0; i++) {
      const k = Math.floor(Math.random() * cells.length);
      const [cx, cy] = cells.splice(k, 1)[0];
      this.crawlers.push(new Crawler(this, this.grid, cx, cy));
    }

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

    // Hint text, above the bat (half scale, sharp at zoom 2)
    this.hintText = this.add.text(0, 0, '', {
      fontFamily: 'monospace', fontSize: '16px', color: '#E8E8FF', align: 'center',
    }).setOrigin(0.5, 1).setScale(0.5).setAlpha(0);

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
    if (grounded && !this.wasGrounded) this.footstep(p, time);
    if (grounded && Math.abs(p.body.velocity.x) > 20 && time >= this.nextStep) {
      this.nextStep = time + 250;
      this.footstep(p, time);
    }
    this.wasGrounded = grounded;

    this.echo.update(time);
    for (const e of this.exits) e.light.update(time, delta);
    for (const c of this.crawlers) c.update(time, delta, p);
    this.drawHint(p);

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
      for (const e of this.exits) d.strokeRect(e.box.x, e.box.y, e.box.w, e.box.h);
      d.lineStyle(1, 0xFF4A5A, 0.4);
      for (const c of this.crawlers) d.strokeCircle(c.x, c.y, CRAWLER.KILL);
    }

    if (this.room.spikeBoxes.some((s) => overlaps(me, s))) return this.die();

    // Close to an exit, reveal it
    let inside = null;
    for (const e of this.exits) {
      if (distToBox(p.x, p.y, e.box) < EXIT.NEAR) e.light.reveal(time);
      if (overlaps(me, e.box)) inside = e;
    }

    // Stay in exit to leave
    if (inside) {
      this.exitTime += delta;
      if (this.exitTime >= EXIT.STAY_MS) return this.leave(inside);
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
    this.nextShout = time + ECHO.COOLDOWN;
    const p = this.player;
    const aim = this.getAim();

    // Tap to focus, blended by charge
    const cone = ECHO.CONE + (FOCUS.CONE - ECHO.CONE) * charge;
    const range = ECHO.SHOUT_RANGE + (FOCUS.RANGE - ECHO.SHOUT_RANGE) * charge;
    const power = 1 + (FOCUS.RECOIL_MULT - 1) * charge;

    const hits = this.echo.shout(p.x, p.y, aim, cone, range);
    p.shoutPose(time);
    this.checkExit(p, aim, time, cone, range);

    // Crawlers: beside it, dead. Further, it hears (focus is louder)
    const loud = 1 + charge * 0.5;
    for (const c of this.crawlers) {
      if (c.near(p.x, p.y)) {
        c.reveal(time);
        return this.die();
      }
      c.hear(p.x, p.y, loud, time);
      if (c.dist(p.x, p.y) < range) c.reveal(time);
    }

    // Recoil, once per air
    const onGround = p.body.blocked.down;
    const aimingDown = Math.sin(aim) > 0.7;
    if (!onGround && !p.airCharge) return;

    let push = recoilFrom(hits, onGround && !aimingDown, power);

    // Focus dash, away from aim (open air too)
    if (charge > 0) {
      const dash = FOCUS.DASH * charge;
      if (!push || Math.hypot(push.x, push.y) < dash) {
        push = { x: -Math.cos(aim) * dash, y: -Math.sin(aim) * dash };
      }
    }
    if (!push) return;

    const lock = charge > 0 ? FOCUS.LOCK_MS : RECOIL.LOCK_MS;
    p.recoil(push, time, lock);
    if (!onGround) p.airCharge = false;
    this.cameras.main.shake(80, 0.003 * power);
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

  // Footstep, tiny echo, crawlers right beside notice
  footstep(p, time) {
    this.echo.smallPing(p.x, p.y + 4);
    for (const c of this.crawlers) {
      c.step(p.x, p.y);
      if (c.dist(p.x, p.y) < ECHO.STEP_RANGE + 8) c.reveal(time);
    }
  }

  // Hint text when inside a hint box
  drawHint(p) {
    const h = this.room.hints.find((r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h);
    const t = this.hintText;
    if (h && t.text !== h.text) t.setText(h.text);
    t.setPosition(p.x, p.y - 22);
    t.setAlpha(Phaser.Math.Clamp(t.alpha + (h ? 0.08 : -0.08), 0, 1));
  }

  // Exits found by shout/echo
  checkExit(p, aim, time, cone, range) {
    for (const e of this.exits) {
      if (e.light.seen) continue;
      const dx = e.x + e.width / 2 - p.x;
      const dy = e.y + e.height / 2 - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range) continue;

      // Inside cone
      const angle = Math.atan2(dy, dx);
      const off = Math.abs(Math.atan2(Math.sin(angle - aim), Math.cos(angle - aim)));
      if (off > (cone * Math.PI) / 360) continue;

      // Not behind rock
      if (this.grid.castRay(p.x, p.y, angle, dist - 8)) continue;

      e.light.reveal(time + (dist / ECHO.RING_SPEED) * 1000);
    }
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

  // Walk out, then story cards or the next room
  leave(e) {
    this.leaving = true;
    this.exitG.clear();
    const p = this.player;
    p.body.setVelocityX(p.flipX ? -90 : 90);
    p.play('bat-run', true);
    this.cameras.main.fadeOut(300);

    this.time.delayedCall(300, () => {
      this.registry.set('room', e.to ?? 'end');
      this.registry.set('entry', e.entry ?? 'spawn');

      // Story once per key
      if (e.story && !this.registry.get(`story-${e.story}`)) {
        this.registry.set(`story-${e.story}`, true);
        this.scene.start('Story', { key: e.story });
      } else if (e.to === 'end' || !e.to) {
        this.scene.start('Title');
      } else {
        this.scene.restart();
      }
    });
  }
}