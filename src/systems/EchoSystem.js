import { TILE, ECHO as E } from '../config.js';

const COLORS = { 1: 0x5EF2FF, 2: 0xFF4A5A };

// Fixed noise
function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Jagged corner
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
    this.trace = scene.add.graphics();
    this.glow = scene.add.graphics();
    this.rings = scene.add.graphics();
    this.active = [];
    this.ringList = [];
    this.seen = new Set();
  }

  shout(x, y) {
    return this.ping(x, y, E.SHOUT_RAYS, E.SHOUT_RANGE, true);
  }

  smallPing(x, y) {
    return this.ping(x, y, E.STEP_RAYS, E.STEP_RANGE, false);
  }

  ping(x, y, rays, range, withRing) {
    const now = this.scene.time.now;
    const hits = [];
    const keys = new Set();

    for (let i = 0; i < rays; i++) {
      const angle = (i * Math.PI * 2) / rays + 0.001;
      const hit = this.grid.castRay(x, y, angle, range);
      if (!hit) continue;
      hits.push(hit);

      // One glow per tile edge
      const key = `${hit.tx},${hit.ty},${hit.face}`;
      if (keys.has(key)) continue;
      keys.add(key);

      // Lights when ring arrives
      this.active.push({
        key,
        cell: hit.cell,
        pts: this.faceSegment(hit),
        start: now + (hit.dist / E.RING_SPEED) * 1000,
      });
    }

    if (withRing) this.ringList.push({ x, y, range, start: now });
    return hits;
  }

  // Tile edge, jagged
  faceSegment({ tx, ty, face }) {
    const ends = {
      W: [[tx, ty], [tx, ty + 1]],
      E: [[tx + 1, ty], [tx + 1, ty + 1]],
      N: [[tx, ty], [tx + 1, ty]],
      S: [[tx, ty + 1], [tx + 1, ty + 1]],
    }[face];
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

  update(time) {
    // Glow, fade
    this.glow.clear();
    this.active = this.active.filter((s) => {
      const age = time - s.start;
      if (age < 0) return true;
      if (age >= E.GLOW_MS) {
        this.stamp(s);
        return false;
      }
      const alpha = 1 - (1 - E.TRACE_ALPHA) * (age / E.GLOW_MS);
      this.glow.lineStyle(6, COLORS[s.cell], alpha * 0.25);
      this.glow.strokePoints(s.pts);
      this.glow.lineStyle(2, COLORS[s.cell], alpha);
      this.glow.strokePoints(s.pts);
      return true;
    });

    // Rings
    this.rings.clear();
    this.ringList = this.ringList.filter((r) => {
      const radius = ((time - r.start) / 1000) * E.RING_SPEED;
      if (radius > r.range) return false;
      const k = radius / r.range;
      this.rings.lineStyle(3 - 2 * k, 0xE8E8FF, 0.8 * (1 - k));
      this.rings.strokeCircle(r.x, r.y, radius);
      return true;
    });
  }

  // Faint permanent outline
  stamp(s) {
    if (this.seen.has(s.key)) return;
    this.seen.add(s.key);
    this.trace.lineStyle(1.5, COLORS[s.cell], E.TRACE_ALPHA);
    this.trace.strokePoints(s.pts);
  }
}