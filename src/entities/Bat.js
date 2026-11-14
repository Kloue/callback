import * as Phaser from 'phaser';
import { PLAYER as P } from '../config.js';

const JustDown = Phaser.Input.Keyboard.JustDown;

// Smooth accell/decel
function moveTowards(value, target, maxStep) {
  if (Math.abs(target - value) <= maxStep) return target;
  return value + Math.sign(target - value) * maxStep;
}

export default class Bat extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'bat', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Body only, no wings
    this.body.setSize(8, 11).setOffset(4, 3);
    this.body.maxVelocity.y = P.MAX_FALL;

    this.keys = scene.input.keyboard.addKeys({
      left: 'LEFT', right: 'RIGHT', a: 'A', d: 'D',
      jump: 'SPACE', up: 'UP', w: 'W',
    });

    // No page scrolling
    scene.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');

    // buffer, recoil lock
    this.lastGrounded = -Infinity;
    this.lastJumpPressed = -Infinity;
    this.controlLockUntil = 0;
    this.rising = false;

    Bat.createAnims(scene);
    this.play('bat-idle');
  }

  // Animations
  static createAnims(scene) {
    if (scene.anims.exists('bat-idle')) return;
    const frames = (list) => scene.anims.generateFrameNumbers('bat', { frames: list });
    scene.anims.create({ key: 'bat-idle', frames: frames([0, 0, 0, 0, 0, 1]), frameRate: 4, repeat: -1 });
    scene.anims.create({ key: 'bat-run', frames: frames([2, 3]), frameRate: 8, repeat: -1 });
    scene.anims.create({ key: 'bat-jump', frames: frames([4]) });
    scene.anims.create({ key: 'bat-fall', frames: frames([5]) });
  }

  update(time, delta) {
    // Lag cap
    const dt = Math.min(delta, 50) / 1000;
    const b = this.body;
    const k = this.keys;

    const grounded = b.blocked.down;
    if (grounded) this.lastGrounded = time;

    // -1 left, 1 right
    const dir = ((k.right.isDown || k.d.isDown) ? 1 : 0) - ((k.left.isDown || k.a.isDown) ? 1 : 0);

    // Run
    if (time >= this.controlLockUntil) {
      const accel = grounded ? (dir !== 0 ? P.GROUND_ACCEL : P.GROUND_DECEL) : P.AIR_ACCEL;
      b.velocity.x = moveTowards(b.velocity.x, dir * P.RUN_SPEED, accel * dt);
    }

    if (JustDown(k.jump) || JustDown(k.up) || JustDown(k.w)) this.lastJumpPressed = time;
    const jumpHeld = k.jump.isDown || k.up.isDown || k.w.isDown;

    // Jump
    if (time - this.lastJumpPressed <= P.JUMP_BUFFER && time - this.lastGrounded <= P.COYOTE) {
      b.velocity.y = P.JUMP_VELOCITY;
      this.lastJumpPressed = -Infinity;
      this.lastGrounded = -Infinity;
      this.rising = true;
    }

    // Short hop on release
    if (this.rising && !jumpHeld && b.velocity.y < 0) {
      b.velocity.y *= P.JUMP_CUT;
      this.rising = false;
    }
    if (b.velocity.y >= 0) this.rising = false;

    // Facing, anims
    if (dir !== 0) this.setFlipX(dir < 0);
    if (!grounded) this.play(b.velocity.y < 0 ? 'bat-jump' : 'bat-fall', true);
    else this.play(dir !== 0 ? 'bat-run' : 'bat-idle', true);
  }
}