export default class ExitLight {
  constructor(scene, exit, key) {
    this.scene = scene;
    this.key = key;
    this.x = exit.x;
    this.y = exit.y;
    this.w = exit.width;
    this.h = exit.height;
    this.g = scene.add.graphics();
    this.motes = Array.from({ length: 14 }, () => this.newMote(true));

    // if seen before, stays lit
    this.revealAt = scene.registry.get(key) ? 0 : Infinity;
  }

  get seen() {
    return this.revealAt !== Infinity;
  }

  // Found by echo (first time)
  reveal(at) {
    if (at >= this.revealAt) return;
    this.revealAt = at;
    this.scene.registry.set(this.key, true);
  }

  newMote(anywhere) {
    return {
      x: this.x + Math.random() * this.w,
      y: anywhere ? this.y + Math.random() * this.h : this.y + this.h,
      speed: 8 + Math.random() * 14,
      size: Math.random() < 0.3 ? 2 : 1,
    };
  }

  update(time, delta) {
    const g = this.g;
    g.clear();
    if (time < this.revealAt) return;

    // Fade in
    const fade = Math.min(1, (time - this.revealAt) / 600);

    // Soft glow, pulsing
    const pulse = 0.5 + 0.5 * Math.sin(time / 600);
    for (let i = 0; i < 4; i++) {
      const pad = i * 4;
      g.fillStyle(0xFFC46B, ((0.04 + 0.03 * pulse) / (i + 1)) * fade);
      g.fillRect(this.x - pad, this.y - pad, this.w + pad * 2, this.h + pad * 2);
    }

    // Dust floating around
    for (const m of this.motes) {
      m.y -= (m.speed * delta) / 1000;
      if (m.y < this.y) Object.assign(m, this.newMote(false));
      g.fillStyle(0xFFE6B0, 0.6 * ((m.y - this.y) / this.h) * fade);
      g.fillRect(m.x, m.y, m.size, m.size);
    }
  }
}