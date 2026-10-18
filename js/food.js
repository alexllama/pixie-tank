import { groundY, tankW } from './terrain.js';

const SINK_SPEED = 8;
const FLOOR_LIFE = 15;
const MAX_PELLETS = 24;

export class FoodSystem {
  constructor() {
    this.pellets = [];
    this.autoTimer = 8;
  }

  get hasFood() {
    return this.pellets.some((p) => p.alive);
  }

  drop(x, y = 8) {
    if (this.pellets.length >= MAX_PELLETS) this.pellets.shift();
    this.pellets.push({
      x: Math.max(16, Math.min(tankW() - 16, x + (Math.random() - 0.5) * 6)),
      y,
      vy: SINK_SPEED * (0.85 + Math.random() * 0.3),
      age: 0,
      floorS: 0,
      alive: true,
      fromPlayer: true
    });
  }

  dropBurst(n = 4, cx = null) {
    const x = cx ?? tankW() * 0.18 + Math.random() * tankW() * 0.64;
    for (let i = 0; i < n; i++) {
      setTimeout(() => this.drop(x + (Math.random() - 0.5) * 40), i * 180);
    }
  }

  autoFeed(dt) {
    this.autoTimer -= dt;
    if (this.autoTimer <= 0) {
      this.dropBurst(5);
      this.autoTimer = 3600;
    }
  }

  timeToNextAuto() {
    return Math.max(0, this.autoTimer);
  }

  update(dt, fishes) {
    for (const p of this.pellets) {
      if (!p.alive) continue;
      p.age += dt;
      const fy = groundY(p.x) - 10;
      if (p.y < fy) {
        p.y += p.vy * dt;
        if (p.y >= fy) p.y = fy;
      } else {
        p.floorS += dt;
        if (p.floorS >= FLOOR_LIFE) { p.alive = false; continue; }
      }
      for (const f of fishes) {
        if (f.dying || f.asleep) continue;
        const d = Math.hypot(f.x - p.x, f.y - p.y);
        if (d < 7 + f.size * 3) {
          f.hunger = Math.max(0, f.hunger - 3.2);
          f.eaten++;
          f.bored = Math.max(0, f.bored - 3);
          p.alive = false;
          break;
        }
      }
      if (p.age > 90) p.alive = false;
    }
    this.pellets = this.pellets.filter((p) => p.alive);
  }

  draw(g) {
    for (const p of this.pellets) {
      const a = p.floorS > FLOOR_LIFE - 3 ? (FLOOR_LIFE - p.floorS) / 3 : 1;
      g.ellipse(p.x, p.y, 1.8, 1.5).fill({ color: 0x8a6a3c, alpha: 0.9 * a });
      g.ellipse(p.x - 0.4, p.y - 0.4, 0.8, 0.6).fill({ color: 0xb89058, alpha: 0.7 * a });
    }
  }
}
