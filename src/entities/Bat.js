import * as Phaser from 'phaser';
import { PLAYER as P, RECOIL } from '../config.js';

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
      up: 'UP', w: 'W', down: 'DOWN', s: 'S',
      jump: 'SPACE',
    });

    // No page scrolling
    scene.input.keyboard.addCapture('SPACE,UP,DOWN,LEFT,RIGHT');

    // buffer, recoil lock
    this.lastGrounded = -Infinity;
    this.lastJumpPressed = -Infinity;
    this.controlLockUntil = 0;
    this.rising = false;
    this.airCharge = true;
    this.shoutUntil = 0;
    this.floatUntil = 0;

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
    scene.anims.create({ key: 'bat-shout', frames: frames([6]) });
  }

  update(time, delta) {
    // Lag cap
    const dt = Math.min(delta, 50) / 1000;
    const b = this.body;
    const k = this.keys;
    const grounded = b.blocked.down;

    // landing on the ground refils the recoil
    if (grounded) {
      this.lastGrounded = time;
      this.airCharge = true;
    }

    // -1 left, 1 right (latest key wins)
    const dir = this.axis(k.left, k.a, k.right, k.d);

    // Focus dash floats, no gravity for a moment
    b.setAllowGravity(time >= this.floatUntil);

    // Run
    if (time >= this.controlLockUntil) {
      const accel = grounded ? (dir !== 0 ? P.GROUND_ACCEL : P.GROUND_DECEL) : P.AIR_ACCEL;
      b.velocity.x = moveTowards(b.velocity.x, dir * P.RUN_SPEED, accel * dt);
    }

    if (JustDown(k.jump)) this.lastJumpPressed = time;
    const jumpHeld = k.jump.isDown;

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

    // Facing, anims (shout first)
    if (dir !== 0) this.setFlipX(dir < 0);
    if (time < this.shoutUntil) this.play('bat-shout', true);
    else if (!grounded) this.play(b.velocity.y < 0 ? 'bat-jump' : 'bat-fall', true);
    else this.play(dir !== 0 ? 'bat-run' : 'bat-idle', true);
  }

  // Echo push, focus locks longer (and can float)
  recoil(push, time, lockMs = RECOIL.LOCK_MS, float = false) {
    this.body.velocity.x = this.body.velocity.x * RECOIL.KEEP + push.x;
    this.body.velocity.y = this.body.velocity.y * RECOIL.KEEP + push.y;
    this.controlLockUntil = time + lockMs;
    if (float) this.floatUntil = time + lockMs;
    this.rising = false;
  }

  // Two keys each way, -1 / 0 / 1, latest pressed wins
  axis(neg1, neg2, pos1, pos2) {
    const neg = Math.max(neg1.isDown ? neg1.timeDown : -1, neg2.isDown ? neg2.timeDown : -1);
    const pos = Math.max(pos1.isDown ? pos1.timeDown : -1, pos2.isDown ? pos2.timeDown : -1);
    if (neg < 0 && pos < 0) return 0;
    return pos > neg ? 1 : -1;
  }

  // Shout frame, short
  shoutPose(time) {
    this.shoutUntil = time + 150;
  }
}