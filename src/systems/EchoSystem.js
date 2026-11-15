import { TILE, ECHO as E } from '../config.js';

const COLORS = { 1: 0x5EF2FF, 2: 0xFF4A5A };
const FULL = Math.PI * 2;

// Fixed noise
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Jagged corners (makes blocks into irregular walls)
function corner(cx, cy) {
  return {
    x: cx * TILE + (hash(cx, cy) - 0.5) * 2 * E.JITTER,
    y: cy * TILE + (hash(cy + 7919, cx) - 0.5) * 2 * E.JITTER,
  };
}

export default class EchoSystem {
  constructor(scene, grid) {
    this.scene = scene;
    this.grid = grid;
    this.glow = scene.add.graphics();
    this.rings = scene.add.graphics();
    this.active = [];
    this.ringList = [];
  }

  // Cone, facing side
  shout(x, y, angle) {
    const spread = (E.CONE * Math.PI) / 180;
    const hits = this.ping(x, y, E.SHOUT_RAYS, E.SHOUT_RANGE, true, angle, spread, true, 1);

    // Close wall, bounce back
    const near = hits.reduce((a, h) => (!a || h.dist < a.dist ? h : a), null);
    if (near && near.dist < E.RETURN_DIST) {
      this.ringList.push({
        x: x + Math.cos(near.angle) * near.dist,
        y: y + Math.sin(near.angle) * near.dist,
        range: E.RETURN_RANGE,
        start: this.scene.time.now + (near.dist / E.RING_SPEED) * 1000,
        centre: near.angle + Math.PI,
        spread: spread * 0.75,
        bright: true,
      });
    }
    return hits;
  }

  // All round, short
  smallPing(x, y) {
    return this.ping(x, y, E.STEP_RAYS, E.STEP_RANGE, false, 0, FULL, false, E.STEP_DIM);
  }

  ping(x, y, rays, range, withRing, centre, spread, bounce, dim) {
    const now = this.scene.time.now;
    const hits = [];
    const keys = new Set();
    const full = spread >= FULL;

    for (let i = 0; i < rays; i++) {
      const angle = full
        ? (i * FULL) / rays + 0.001
        : centre - spread / 2 + (spread * (i + 0.5)) / rays + 0.001;

      const hit = this.grid.castRay(x, y, angle, range);
      if (!hit) continue;
      hit.angle = angle;
      hits.push(hit);
      this.addGlow(hit, hit.dist, dim, now, keys);

      // One bounce, dimmer
      if (!bounce) continue;
      const left = (range - hit.dist) * E.BOUNCE;
      if (left < 8) continue;
      const hx = x + Math.cos(angle) * (hit.dist - 0.5);
      const hy = y + Math.sin(angle) * (hit.dist - 0.5);
      const vertical = hit.face === 'W' || hit.face === 'E';
      const bounced = vertical ? Math.PI - angle : -angle;
      const hit2 = this.grid.castRay(hx, hy, bounced, left);
      if (hit2) this.addGlow(hit2, hit.dist + hit2.dist, dim * E.BOUNCE_DIM, now, keys);
    }

    if (withRing) this.ringList.push({ x, y, range, start: now, centre, spread: full ? null : spread });
    return hits;
  }

  // Lights when sound arrives
  addGlow(hit, travelled, dim, now, keys) {
    const key = `${hit.tx},${hit.ty},${hit.face}`;
    if (keys.has(key)) return;
    keys.add(key);
    this.active.push({
      key,
      dim,
      cell: hit.cell,
      pts: this.faceSegment(hit),
      start: now + (travelled / E.RING_SPEED) * 1000,
    });
  }

  // Tile edge, jagged
  faceSegment({ tx, ty, face, cell }) {
    const ends = {
      W: [[tx, ty], [tx, ty + 1]],
      E: [[tx + 1, ty], [tx + 1, ty + 1]],
      N: [[tx, ty], [tx + 1, ty]],
      S: [[tx, ty + 1], [tx + 1, ty + 1]],
    }[face];
    if (cell === 2) return this.teeth(ends, face);

    const a = corner(...ends[0]);
    const b = corner(...ends[1]);
    const n = (hash(tx * 4 + face.charCodeAt(0), ty) - 0.5) * 2 * E.JITTER;
    const vertical = face === 'W' || face === 'E';
    const mid = {
      x: (a.x + b.x) / 2 + (vertical ? n : 0),
      y: (a.y + b.y) / 2 + (vertical ? 0 : n),
    };
    return [a, mid, b];
  }

  // Spike teeth, tips on the edge
  teeth(ends, face) {
    const [ax, ay] = ends[0].map((v) => v * TILE);
    const [bx, by] = ends[1].map((v) => v * TILE);
    const [nx, ny] = { W: [-1, 0], E: [1, 0], N: [0, -1], S: [0, 1] }[face];
    const pts = [];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const inset = i % 2 === 0 ? 6 : 0;
      pts.push({ x: ax + (bx - ax) * t - nx * inset, y: ay + (by - ay) * t - ny * inset });
    }
    return pts;
  }

  update(time) {
    // Glow, fade
    this.glow.clear();
    this.active = this.active.filter((s) => {
      const age = time - s.start;
      if (age < 0) return true;
      if (age >= E.GLOW_MS) return false;
      const alpha = (1 - age / E.GLOW_MS) ** 1.5 * s.dim;
      this.glow.lineStyle(6, COLORS[s.cell], alpha * 0.25);
      this.glow.strokePoints(s.pts);
      this.glow.lineStyle(2, COLORS[s.cell], alpha);
      this.glow.strokePoints(s.pts);
      return true;
    });

    // Ring, arc if cone
    this.rings.clear();
    this.ringList = this.ringList.filter((r) => {
      const radius = ((time - r.start) / 1000) * E.RING_SPEED;
      if (radius < 0) return true;
      if (radius > r.range) return false;
      const k = radius / r.range;
      const color = r.bright ? 0x5EF2FF : 0xE8E8FF;
      this.rings.lineStyle((r.bright ? 2.5 : 3) - 2 * k, color, (r.bright ? 1 : 0.8) * (1 - k));
      if (r.spread) {
        this.rings.beginPath();
        this.rings.arc(r.x, r.y, radius, r.centre - r.spread / 2, r.centre + r.spread / 2);
        this.rings.strokePath();
      } else {
        this.rings.strokeCircle(r.x, r.y, radius);
      }
      return true;
    });
  }
}