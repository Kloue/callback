export function loadRoom(scene, key) {
  const map = scene.make.tilemap({ key });
  const tiles = map.addTilesetImage('cave', 'cave'); // Tiled tileset name, Phaser texture key

  const solid = map.createLayer('solid', tiles, 0, 0);
  solid.setCollisionByExclusion([-1]);

  const spikes = map.getLayer('spikes') ? map.createLayer('spikes', tiles, 0, 0) : null;

  const objects = map.getObjectLayer('objects')?.objects ?? [];
  const find = (name) => objects.find((o) => o.name === name);
  const spawn = find('spawn');
  const exit = find('exit');

  if (!spawn || !exit) {
    throw new Error(`Room "${key}" needs a point named 'spawn' and a rectangle named 'exit'`);
  }

  return { map, solid, spikes, objects, spawn, exit };
}