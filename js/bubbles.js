import { Container, Sprite, Texture } from './pixi.js';
import { groundY, tankW } from './terrain.js';

const MAX_BUBBLES = 60;

function bakeBubbleTexture() {
  const S = 32;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const cx = S / 2, cy = S / 2, r = S / 2 - 1;
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  grad.addColorStop(0, 'rgba(232,246,250,0.55)');
  grad.addColorStop(0.55, 'rgba(191,224,234,0.22)');
  grad.addColorStop(1, 'rgba(191,224,234,0.34)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(232,246,250,0.5)';
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  return Texture.from(c);
}

export class BubbleSystem {
  constructor(columnX = 340) {
    this.columnX = columnX;
    this.bubbles = [];
    this.view = new Container();
    const tex = bakeBubbleTexture();
    for (let i = 0; i < MAX_BUBBLES; i++) {
      const column = Math.random() < 0.55;
      const b = this.make(column, true);
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      this.bubbles.push({ ...b, sprite });
      this.view.addChild(sprite);
    }
    this.sync();
  }

  make(column, anywhere = false) {
    const x = column
      ? this.columnX + (Math.random() - 0.5) * 18
      : 10 + Math.random() * Math.max(20, tankW() - 20);
    const floor = groundY(x);
    return {
      x,
      y: anywhere ? Math.random() * floor : floor + Math.random() * 10,
      vy: column ? 16 + Math.random() * 14 : 10 + Math.random() * 8,
      r: column ? 1.2 + Math.random() * 2.2 : 1 + Math.random() * 1.6,
      wobble: Math.random() * Math.PI * 2,
      column
    };
  }

  sync() {
    for (const b of this.bubbles) {
      b.sprite.x = b.x;
      b.sprite.y = b.y;
      b.sprite.setSize(b.r * 2, b.r * 2);
    }
  }

  update(dt, clock) {
    const W = tankW();
    for (const b of this.bubbles) {
      b.wobble += dt * 2.5;
      b.y -= b.vy * dt;
      b.x += Math.sin(b.wobble) * dt * (b.column ? 9 : 4);
      if (b.x < 6) b.x = 6;
      if (b.x > W - 6) b.x = W - 6;
      if (b.y < -6) {
        const nb = this.make(b.column);
        b.x = nb.x; b.y = nb.y; b.vy = nb.vy; b.r = nb.r;
      }
    }
    this.sync();
  }
}
