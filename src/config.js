export const TILE = 16;
export const WIDTH = 640;
export const HEIGHT = 352;
export const GRAVITY = 1100;
export const ROOM_W = 40;
export const ROOM_H = 22;

export const PLAYER = {
  RUN_SPEED: 150,
  GROUND_ACCEL: 1400,
  GROUND_DECEL: 1800,
  AIR_ACCEL: 900,
  JUMP_VELOCITY: -330,
  JUMP_CUT: 0.45,
  MAX_FALL: 420,
  COYOTE: 90,
  JUMP_BUFFER: 110,
};

export const ECHO = {
  RING_SPEED: 600,
  SHOUT_RANGE: 160,
  SHOUT_RAYS: 90,
  CONE: 120,
  BOUNCE: 0.6,
  BOUNCE_DIM: 0.5,
  RETURN_DIST: 48,
  RETURN_RANGE: 56,
  STEP_RANGE: 24,
  STEP_RAYS: 12,
  STEP_DIM: 0.35,
  GLOW_MS: 2500,
  JITTER: 3,
  COOLDOWN: 250,
};

export const RECOIL = {
  RANGE: 48,
  MAX: 360,
  KEEP: 0.3,
  LOCK_MS: 120,
};