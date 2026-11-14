export function loadRoom(scene, key) {
  // Tiled Map, tileset --> image
  const map = scene.make.tilemap({ key });
  const tiles = map.addTilesetImage('cave', 'cave');

  const solid = map.createLayer('solid', tiles, 0, 0);
  solid.setCollisionByExclusion([-1]);

  // Spikes, optional
  const spikes = map.getLayer('spikes') ? map.createLayer('spikes', tiles, 0, 0) : null;

  // Spawn, exit
  const objects = map.getObjectLayer('objects')?.objects ?? [];
  const find = (name) => objects.find((o) => o.name === name);
  const spawn = find('spawn');
  const exit = find('exit');

  // Missing check
  if (!spawn || !exit) {
    throw new Error(`Room "${key}" needs a point named 'spawn' and a rectangle named 'exit'`);
  }

  return { map, solid, spikes, objects, spawn, exit };
}