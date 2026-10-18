import { groundY, tankW } from './terrain.js';

const MAX_BUBBLES = 60;

export class BubbleSystem {
  constructor(columnX = 340) {
    this.columnX = columnX;
    this.bubbles = [];
    for (let i = 0; i < MAX_BUBBLES; i++) {
      const column = Math.random() < 0.55;
      this.bubbles.push(this.make(column, true));
    }
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
  }

  draw(g) {
    for (const b of this.bubbles) {
      g.circle(b.x, b.y, b.r).fill({ color: 0xbfe0ea, alpha: 0.22 });
      g.circle(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.45).fill({ color: 0xe8f6fa, alpha: 0.4 });
    }
  }
}
