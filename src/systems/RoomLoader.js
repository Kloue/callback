// Spike hitbox by tile: x, y, w, h (only its base)
const x = 8
const SPIKE_BOX = {
  2: [1, 16 - x, 14, x],
  3: [1, 0, 14, x],
  4: [16 - x, 1, x, 14],
  5: [0, 1, x, 14],
};

export function loadRoom(scene, key) {
  // Tiled Map, tileset --> image
  const map = scene.make.tilemap({ key });
  const tiles = map.addTilesetImage('cave', 'cave');

  const solid = map.createLayer('solid', tiles, 0, 0);
  solid.setCollisionByExclusion([-1]);

  // Spikes, optional
  const spikes = map.getLayer('spikes') ? map.createLayer('spikes', tiles, 0, 0) : null;

  const spikeBoxes = [];
  spikes?.forEachTile((t) => {
    const box = SPIKE_BOX[t.index];
    if (box) spikeBoxes.push({ x: t.pixelX + box[0], y: t.pixelY + box[1], w: box[2], h: box[3] });
  });

  // Spawn, exit
  const objects = map.getObjectLayer('objects')?.objects ?? [];
  const find = (name) => objects.find((o) => o.name === name);
  const spawn = find('spawn');
  const exit = find('exit');

  // Missing check
  if (!spawn || !exit) {
    throw new Error(`Room "${key}" needs a point named 'spawn' and a rectangle named 'exit'`);
  }

  return { map, solid, spikes, spikeBoxes, objects, spawn, exit };
}