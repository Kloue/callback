export const TILE = 16;
export const WIDTH = 640;
export const HEIGHT = 352;
export const GRAVITY = 1100;
export const ROOM_W = 40;
export const ROOM_H = 22;
export const CAMERA_ZOOM = 2;

export const PLAYER = {
  RUN_SPEED: 150,
  GROUND_ACCEL: 1400,
  GROUND_DECEL: 1800,
  AIR_ACCEL: 900,
  JUMP_VELOCITY: -300,
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
  MAX: 200,
  KEEP: 0.3,
  LOCK_MS: 120,
};

// Hold shout to focus
export const FOCUS = {
  HOLD_MS: 250,
  CHARGE_MS: 500,
  CONE: 40,
  RANGE: 240,
  RECOIL_MULT: 2.5,
  // Dash, away from aim, works in open air
  DASH: 280,
  LOCK_MS: 260,
  // Slow motion while focusing in the air (2 = half speed)
  SLOWMO: 2.5,
};

export const RESPAWN_MS = 400;

export const EXIT = {
  NEAR: 24,
  STAY_MS: 700,
};

// Crawler, kills if you shout beside it
export const CRAWLER = {
  CRAWL_SPEED: 30,
  CHASE_SPEED: 90,
  HEARING: 150,
  NOTICE: 22,
  KILL: 40,
  LOSE: 150,
  SEEK_MS: 6000,
  SAFE: 120,
};