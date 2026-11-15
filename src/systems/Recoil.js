import { RECOIL as R } from '../config.js';

// Push direction per face
const NORMALS = { W: [-1, 0], E: [1, 0], N: [0, -1], S: [0, 1] };

// Spikes scatter, weaker push
const SPIKE_PUSH = 0.4;

export function recoilFrom(hits, ignoreFloor, mult = 1) {
  let sx = 0;
  let sy = 0;
  let nearest = Infinity;
  let total = 0;
  let kept = 0;

  for (const h of hits) {
    if (h.dist > R.RANGE) continue;
    const [nx, ny] = NORMALS[h.face];

    // Skip floor when standing (unless aiming down)
    if (ignoreFloor && ny < 0) continue;

    // Closer, stronger
    let w = (1 - h.dist / R.RANGE) ** 2;
    total += w;
    if (h.cell === 2) w *= SPIKE_PUSH;
    kept += w;

    sx += nx * w;
    sy += ny * w;
    nearest = Math.min(nearest, h.dist);
  }

  const len = Math.hypot(sx, sy);
  if (len === 0) return null;

  // Spike share, softer push
  const soft = kept / total;

  // Focus multiplies the push
  const strength = R.MAX * mult * (1 - nearest / R.RANGE) * soft;
  return { x: (sx / len) * strength, y: (sy / len) * strength };
}