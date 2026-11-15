import { TILE, ROOM_W, ROOM_H } from '../config.js';

// 0 empty, 1 rock, 2 spike
export default class EchoGrid {
  constructor(solid, spikes) {
    this.w = ROOM_W;
    this.h = ROOM_H;
    this.cells = new Uint8Array(this.w * this.h);
    solid.forEachTile((t) => { if (t.index !== -1) this.set(t.x, t.y, 1); });
    spikes?.forEachTile((t) => { if (t.index !== -1) this.set(t.x, t.y, 2); });
  }

  set(x, y, v) {
    this.cells[y * this.w + x] = v;
  }

  // Outside = rock
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 1;
    return this.cells[y * this.w + x];
  }

  // Ray through grid, first hit
  castRay(ox, oy, angle, maxDist) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let tx = Math.floor(ox / TILE);
    let ty = Math.floor(oy / TILE);
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const tDeltaX = Math.abs(TILE / dx);
    const tDeltaY = Math.abs(TILE / dy);
    let tMaxX = ((dx > 0 ? (tx + 1) * TILE : tx * TILE) - ox) / dx;
    let tMaxY = ((dy > 0 ? (ty + 1) * TILE : ty * TILE) - oy) / dy;
    let dist = 0;
    let face;

    while (dist <= maxDist) {
      if (tMaxX < tMaxY) {
        dist = tMaxX; tMaxX += tDeltaX; tx += stepX;
        face = stepX > 0 ? 'W' : 'E';
      } else {
        dist = tMaxY; tMaxY += tDeltaY; ty += stepY;
        face = stepY > 0 ? 'N' : 'S';
      }
      const cell = this.get(tx, ty);
      if (cell) return { tx, ty, face, dist, cell };
    }
    return null;
  }
}