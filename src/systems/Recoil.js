import { RECOIL as R } from '../config.js';

// Push direction per face
const NORMALS = { W: [-1, 0], E: [1, 0], N: [0, -1], S: [0, 1] };

export function recoilFrom(hits, grounded) {
  let sx = 0;
  let sy = 0;
  let nearest = Infinity;

  for (const h of hits) {
    if (h.dist > R.RANGE) continue;
    const [nx, ny] = NORMALS[h.face];

    // No floor hop
    if (grounded && ny < 0) continue;

    // Closer, stronger
    const w = (1 - h.dist / R.RANGE) ** 2;
    sx += nx * w;
    sy += ny * w;
    nearest = Math.min(nearest, h.dist);
  }

  const len = Math.hypot(sx, sy);
  if (len === 0) return null;

  const strength = R.MAX * (1 - nearest / R.RANGE);
  return { x: (sx / len) * strength, y: (sy / len) * strength };
}