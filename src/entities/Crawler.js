import { TILE, CRAWLER as C } from '../config.js';

// Neighbours, 8 ways
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Wall cell: empty, next to rock
export function isWall(grid, cx, cy) {
  if (grid.get(cx, cy) !== 0) return false;
  return grid.get(cx + 1, cy) === 1 || grid.get(cx - 1, cy) === 1
    || grid.get(cx, cy + 1) === 1 || grid.get(cx, cy - 1) === 1;
}

// Every wall cell in the room
// Wall cells in big connected patches only (no tiny pockets to get stuck in)
export function wallCells(grid, minSize = 40) {
  const seen = new Uint8Array(grid.w * grid.h);
  const cells = [];
  for (let cy = 0; cy < grid.h; cy++) {
    for (let cx = 0; cx < grid.w; cx++) {
      if (seen[cy * grid.w + cx] || !isWall(grid, cx, cy)) continue;

      // Flood fill this patch
      const patch = [];
      const todo = [[cx, cy]];
      seen[cy * grid.w + cx] = 1;
      while (todo.length > 0) {
        const [x, y] = todo.pop();
        patch.push([x, y]);
        for (const [dx, dy] of DIRS) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= grid.w || ny >= grid.h) continue;
          if (seen[ny * grid.w + nx] || !isWall(grid, nx, ny)) continue;
          seen[ny * grid.w + nx] = 1;
          todo.push([nx, ny]);
        }
      }
      if (patch.length >= minSize) cells.push(...patch);
    }
  }
  return cells;
}

export default class Crawler {
  constructor(scene, grid, cx, cy) {
    this.grid = grid;
    this.cx = cx;
    this.cy = cy;
    this.prevX = cx;
    this.prevY = cy;
    this.x = cx * TILE + TILE / 2;
    this.y = cy * TILE + TILE / 2;
    this.state = 'wander';
    this.targetX = this.x;
    this.targetY = this.y;
    this.seekUntil = 0;
    this.seenUntil = 0;
    this.pauseUntil = 0;

    Crawler.createAnims(scene);
    this.sprite = scene.add.sprite(this.x, this.y, 'crawler').play('crawler-walk').setAlpha(0);
    this.eyes = scene.add.graphics();
  }

  static createAnims(scene) {
    if (scene.anims.exists('crawler-walk')) return;
    const frames = scene.anims.generateFrameNumbers('crawler', { frames: [0, 1] });
    scene.anims.create({ key: 'crawler-walk', frames, frameRate: 6, repeat: -1 });
  }

  dist(x, y) {
    return Math.hypot(x - this.x, y - this.y);
  }

  // Heard a shout, go there
  hear(x, y, loudness, time) {
    if (this.state === 'chase') return;
    if (this.dist(x, y) > C.HEARING * loudness) return;
    this.state = 'seek';
    this.targetX = x;
    this.targetY = y;
    this.seekUntil = time + C.SEEK_MS;
  }

  // Footsteps, only right beside it
  step(x, y) {
    if (this.dist(x, y) < C.NOTICE) this.state = 'chase';
  }

  // Too close to shout
  near(x, y) {
    return this.dist(x, y) < C.KILL;
  }

  // Lit up by echo
  reveal(time) {
    this.seenUntil = time + 1200;
  }

  // Next wall cell: towards target, or random
  pickNext(towards) {
    const options = [];
    for (const [dx, dy] of DIRS) {
      const nx = this.cx + dx;
      const ny = this.cy + dy;
      if (nx === this.prevX && ny === this.prevY) continue;
      if (isWall(this.grid, nx, ny)) options.push([nx, ny]);
    }
    // Dead end, go back
    if (options.length === 0) options.push([this.prevX, this.prevY]);

    let pick = options[Math.floor(Math.random() * options.length)];

    if (towards) {
      // Closest to the target
      let best = Infinity;
      for (const o of options) {
        const d = Math.hypot(o[0] * TILE + 8 - this.targetX, o[1] * TILE + 8 - this.targetY);
        if (d < best) {
          best = d;
          pick = o;
        }
      }
    } else if (Math.random() < 0.75) {
      // Mostly keep going the same way
      const mx = this.cx - this.prevX;
      const my = this.cy - this.prevY;
      let best = -Infinity;
      for (const o of options) {
        const dot = (o[0] - this.cx) * mx + (o[1] - this.cy) * my;
        if (dot > best) {
          best = dot;
          pick = o;
        }
      }
    }

    this.prevX = this.cx;
    this.prevY = this.cy;
    this.cx = pick[0];
    this.cy = pick[1];
  }

  // Move towards a point, true when arrived
  moveTo(x, y, speed, dt) {
    const dx = x - this.x;
    const dy = y - this.y;
    const d = Math.hypot(dx, dy);
    const step = speed * dt;
    if (d <= step) {
      this.x = x;
      this.y = y;
      return true;
    }
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    return false;
  }

  update(time, delta, bat) {
    const dt = Math.min(delta, 50) / 1000;

    // Chase the bat, give up if far
    if (this.state === 'chase') {
      this.targetX = bat.x;
      this.targetY = bat.y;
      if (this.dist(bat.x, bat.y) > C.LOSE) this.state = 'wander';
    }
    if (this.state === 'seek' && time > this.seekUntil) this.state = 'wander';

    // Crawl cell to cell
    const wander = this.state === 'wander';
    const speed = wander ? C.CRAWL_SPEED : C.CHASE_SPEED;
    const wx = this.cx * TILE + TILE / 2;
    const wy = this.cy * TILE + TILE / 2;
    if (time >= this.pauseUntil && this.moveTo(wx, wy, speed, dt)) {
      // Stops to listen sometimes
      if (wander && Math.random() < 0.15) this.pauseUntil = time + 400 + Math.random() * 800;
      // Reached the shout, back to wandering
      if (this.state === 'seek' && this.dist(this.targetX, this.targetY) < 20) this.state = 'wander';
      this.pickNext(!wander);
    }

    this.draw(time, bat);
  }

  draw(time, bat) {
    // Legs to the wall
    const g = this.grid;
    let angle = 0;
    if (g.get(this.cx, this.cy + 1) === 1) angle = 0;
    else if (g.get(this.cx, this.cy - 1) === 1) angle = Math.PI;
    else if (g.get(this.cx - 1, this.cy) === 1) angle = Math.PI / 2;
    else if (g.get(this.cx + 1, this.cy) === 1) angle = -Math.PI / 2;

    // Seen by echo and then fades out
    const lit = Math.max(0, Math.min(1, (this.seenUntil - time) / 400));
    this.sprite.setPosition(this.x, this.y).setRotation(angle).setAlpha(lit);

    // Red eyes: chasing, or too close to shout
    const e = this.eyes.clear();
    const warn = this.state === 'chase' || this.near(bat.x, bat.y);
    if (!warn || lit > 0.5) return;
    const pulse = 0.6 + 0.4 * Math.sin(time / 120);
    e.fillStyle(0xFF4A5A, pulse);
    e.fillRect(this.x - 3, this.y - 1, 2, 2);
    e.fillRect(this.x + 1, this.y - 1, 2, 2);
  }
}