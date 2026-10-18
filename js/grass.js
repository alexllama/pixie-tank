import { groundY, tankW, tankH } from './terrain.js';

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class GrassBed {
  constructor(cx, width, fronds, depth) {
    this.cx = cx;
    this.width = width;
    this.depth = depth;
    this.fronds = [];
    const vs = clamp(tankH() / 368, 1, 2);
    const r = mulberry((cx * 7919) | 0);
    for (let i = 0; i < fronds; i++) {
      const x = cx - width / 2 + (i / (fronds - 1)) * width + (r() - 0.5) * 6;
      this.fronds.push({
        x,
        h: (70 + r() * 150) * vs,
        phase: r() * Math.PI * 2,
        lean: (r() - 0.5) * 18,
        w: 1.6 + r() * 1.2,
        hue: r()
      });
    }
  }

  draw(g, clock) {
    for (const fr of this.fronds) {
      const sway = Math.sin(clock * 0.9 + fr.phase) * (6 + fr.h * 0.06)
                 + Math.sin(clock * 1.7 + fr.phase * 2.1) * 2.5;
      const baseY = groundY(fr.x) + 2;
      const tipX = fr.x + fr.lean + sway;
      const tipY = baseY - fr.h;
      const ctrlX = fr.x + fr.lean * 0.3 + sway * 0.25;
      const ctrlY = baseY - fr.h * 0.55;
      const g0 = 0x1d5c3a, g1 = 0x3f9a5a;
      const shade = fr.hue * 0.5;
      const col = mixHex(g0, g1, 0.3 + shade);
      const steps = 7;
      const left = [], right = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const mt = 1 - t;
        const px = mt * mt * fr.x + 2 * mt * t * ctrlX + t * t * tipX;
        const py = mt * mt * baseY + 2 * mt * t * ctrlY + t * t * tipY;
        const w = fr.w * (1 - t * 0.75);
        const dx = (2 * mt * (ctrlX - fr.x) + 2 * t * (tipX - ctrlX));
        const dy = (2 * mt * (ctrlY - baseY) + 2 * t * (tipY - ctrlY));
        const len = Math.hypot(dx, dy) || 1;
        const nx = (-dy / len) * w, ny = (dx / len) * w;
        left.push(px + nx, py + ny);
        right.push(px - nx, py - ny);
      }
      const rev = [];
      for (let i = right.length - 2; i >= 0; i -= 2) {
        rev.push(right[i], right[i + 1]);
      }
      const pts = left.concat(rev);
      g.poly(pts).fill({ color: col, alpha: 0.92 });
    }
  }
}

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t);
}

export function makeBackGrass() {
  const W = tankW();
  const s = clamp(W / 448, 1, 3);
  const mk = (fx, w0, n0) => new GrassBed(W * fx, w0 * s, Math.max(4, Math.round(n0 * s)), 'back');
  return [
    mk(0.156, 60, 9),
    mk(0.357, 46, 7),
    mk(0.670, 54, 8),
    mk(0.871, 50, 7)
  ];
}

export function makeFrontGrass() {
  const W = tankW();
  const s = clamp(W / 448, 1, 3);
  const mk = (fx, w0, n0) => new GrassBed(W * fx, w0 * s, Math.max(4, Math.round(n0 * s)), 'front');
  return [
    mk(0.246, 40, 6),
    mk(0.558, 44, 6),
    mk(0.804, 36, 5)
  ];
}
