import { Container, Sprite, Texture } from './pixi.js';
import { groundY, tankW } from './terrain.js';

const SINK_SPEED = 8;
const FLOOR_LIFE = 15;
const MAX_PELLETS = 24;

function bakePelletTexture() {
  const S = 24;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const cx = S / 2, cy = S / 2;
  ctx.fillStyle = 'rgba(138,106,60,0.9)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, S * 0.34, S * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(184,144,88,0.7)';
  ctx.beginPath();
  ctx.ellipse(cx - S * 0.07, cy - S * 0.07, S * 0.16, S * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  return Texture.from(c);
}

export class FoodSystem {
  constructor() {
    this.pellets = [];
    this.autoTimer = 8;
    this.view = new Container();
    this.tex = bakePelletTexture();
  }

  get hasFood() {
    return this.pellets.some((p) => p.alive);
  }

  drop(x, y = 8) {
    if (this.pellets.length >= MAX_PELLETS) {
      const old = this.pellets.shift();
      old.sprite.removeFromParent();
    }
    const sprite = new Sprite(this.tex);
    sprite.anchor.set(0.5);
    this.view.addChild(sprite);
    this.pellets.push({
      x: Math.max(16, Math.min(tankW() - 16, x + (Math.random() - 0.5) * 6)),
      y,
      vy: SINK_SPEED * (0.85 + Math.random() * 0.3),
      age: 0,
      floorS: 0,
      alive: true,
      fromPlayer: true,
      sprite
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

      const a = p.floorS > FLOOR_LIFE - 3 ? (FLOOR_LIFE - p.floorS) / 3 : 1;
      p.sprite.x = p.x;
      p.sprite.y = p.y;
      p.sprite.alpha = 0.92 * Math.max(0, Math.min(1, a));
    }
    if (this.pellets.some((p) => !p.alive)) {
      for (const p of this.pellets) if (!p.alive) p.sprite.removeFromParent();
      this.pellets = this.pellets.filter((p) => p.alive);
    }
  }
}
