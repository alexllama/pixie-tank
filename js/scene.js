import { Graphics, Texture } from './pixi.js';
import { tankW, tankH, groundY, groundBase } from './terrain.js';

const WATER_TOP = 0x0a3c46;
const WATER_MID = 0x08272f;
const WATER_DEEP = 0x031015;

function hex(c) {
  return '#' + c.toString(16).padStart(6, '0');
}

function mixHex(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((Math.round(ar + (br - ar) * t)) << 16)
       | ((Math.round(ag + (bg - ag) * t)) << 8)
       | Math.round(ab + (bb - ab) * t);
}

function makeRnd(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawRock(ctx, x, y, rx, ry, rnd) {
  const grad = ctx.createLinearGradient(0, y - ry, 0, y + ry);
  grad.addColorStop(0, '#2b3b47');
  grad.addColorStop(1, '#0a1218');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, (rnd() - 0.5) * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(150,180,195,0.13)';
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.3, y - ry * 0.4, rx * 0.42, ry * 0.3, -0.3, 0, Math.PI * 2);
  ctx.fill();
  if (rnd() < 0.55) {
    ctx.fillStyle = 'rgba(44,92,58,0.45)';
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.2, y - ry * 0.1, rx * 0.5, ry * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRockCluster(ctx, cx, gy, s, rnd) {
  const n = 3 + ((rnd() * 3) | 0);
  let x = cx - 34 * s;
  for (let i = 0; i < n; i++) {
    const rx = (13 + rnd() * 20) * s;
    const ry = rx * (0.55 + rnd() * 0.35);
    const y = gy + 3 - ry * (0.5 + rnd() * 0.4);
    drawRock(ctx, x, y, rx, ry, rnd);
    x += rx * (0.95 + rnd() * 0.7);
  }
}

function drawWreck(ctx, W, gy) {
  const s = Math.min(1.6, Math.max(1, W / 448));
  const shipX = W * 0.68;
  ctx.save();
  ctx.translate(shipX, gy + 3);
  ctx.rotate(-0.14);
  ctx.scale(s, s);

  const hull = ctx.createLinearGradient(0, -36, 0, 4);
  hull.addColorStop(0, '#40312a');
  hull.addColorStop(1, '#171310');
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(-75, -34);
  ctx.lineTo(70, -34);
  ctx.bezierCurveTo(80, -22, 68, -4, 32, 0);
  ctx.lineTo(-48, 0);
  ctx.bezierCurveTo(-72, -2, -81, -18, -75, -34);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(14,18,22,0.55)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const px = -58 + i * 34;
    ctx.beginPath();
    ctx.moveTo(px, -32);
    ctx.bezierCurveTo(px + 6, -18, px + 4, -8, px - 2, -2);
    ctx.stroke();
  }

  ctx.strokeStyle = '#4a3a2c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-75, -34);
  ctx.lineTo(70, -34);
  ctx.stroke();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(61,48,37,0.85)';
  for (let x = -60; x <= 56; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, -34);
    ctx.lineTo(x, -41);
    ctx.stroke();
  }

  for (const px of [-36, 0, 36]) {
    ctx.beginPath();
    ctx.arc(px, -18, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#060a0d';
    ctx.fill();
    ctx.strokeStyle = '#7a6a4a';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  ctx.save();
  ctx.translate(-6, -34);
  ctx.rotate(0.2);
  ctx.fillStyle = '#3d3025';
  ctx.beginPath();
  ctx.moveTo(-2.5, 0);
  ctx.lineTo(2.5, 0);
  ctx.lineTo(2, -56);
  ctx.lineTo(-0.5, -66);
  ctx.lineTo(-2.5, -58);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#352a20';
  ctx.fillRect(-16, -44, 34, 3.5);
  ctx.fillStyle = '#6e2a26';
  ctx.beginPath();
  ctx.moveTo(1.5, -58);
  ctx.lineTo(20, -54);
  ctx.lineTo(1.5, -49);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(70, -30);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#3a2d24';
  ctx.fillRect(0, -1.5, 28, 3);
  ctx.restore();

  ctx.restore();

  ctx.fillStyle = '#0b151a';
  ctx.beginPath();
  ctx.ellipse(shipX + 8 * s, gy + 5, 64 * s, 13 * s, -0.1, 0, Math.PI * 2);
  ctx.fill();
}

function makeCanvas(W, H) {
  const S = 2;
  const c = document.createElement('canvas');
  c.width = W * S;
  c.height = H * S;
  const ctx = c.getContext('2d');
  ctx.scale(S, S);
  return { c, ctx };
}

function textureFrom(c) {
  const tex = Texture.from(c);
  tex.source.style.scaleMode = 'linear';
  return tex;
}

export function bakeWaterTexture() {
  const W = tankW();
  const H = tankH();
  const base = groundBase();
  const { c, ctx } = makeCanvas(W, H);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, hex(WATER_TOP));
  grad.addColorStop(0.45, hex(WATER_MID));
  grad.addColorStop(Math.min(1, base / H), hex(WATER_DEEP));
  grad.addColorStop(1, hex(WATER_DEEP));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  return textureFrom(c);
}

// rocks, shipwreck, sand and pebbles are scenery: they stay perfectly still,
// so they're kept out of the water layer that the shimmer displaces
export function bakeGroundTexture() {
  const W = tankW();
  const H = tankH();
  const { c, ctx } = makeCanvas(W, H);

  const rnd = makeRnd(1337);
  const rs = Math.min(1.6, Math.max(1, W / 448));
  drawRockCluster(ctx, W * 0.12, groundY(W * 0.12), rs, rnd);
  drawRockCluster(ctx, W * 0.47, groundY(W * 0.47), rs, rnd);
  drawRockCluster(ctx, W * 0.86, groundY(W * 0.86), rs, rnd);

  drawWreck(ctx, W, groundY(W * 0.68));

  const fillTerrain = () => {
    ctx.beginPath();
    ctx.moveTo(0, groundY(0));
    for (let x = 4; x <= W; x += 4) ctx.lineTo(x, groundY(x));
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
  };

  const sand = ctx.createLinearGradient(0, H * 0.7, 0, H);
  sand.addColorStop(0, '#060d11');
  sand.addColorStop(0.35, '#0b151a');
  sand.addColorStop(1, '#060c10');
  fillTerrain();
  ctx.fillStyle = sand;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, groundY(0));
  for (let x = 4; x <= W; x += 4) ctx.lineTo(x, groundY(x));
  ctx.strokeStyle = 'rgba(96,124,138,0.2)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const pebbleCount = Math.min(160, Math.max(40, Math.round(70 * W * H / (448 * 368))));
  for (let i = 0; i < pebbleCount; i++) {
    const x = rnd() * W;
    const top = groundY(x);
    const y = top + 2 + rnd() * Math.max(4, H - top - 3);
    if (y > H - 1) continue;
    const rx = 1.5 + rnd() * 4;
    const ry = 1 + rnd() * 2.2;
    const shade = 0x18242c + ((rnd() * 0x101010) | 0);
    ctx.fillStyle = hex(shade);
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(90,110,120,0.18)';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.25, y - ry * 0.3, rx * 0.5, ry * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  return textureFrom(c);
}

export function bakeNightGradientTexture() {
  const W = tankW();
  const H = tankH();
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.5)');
  grad.addColorStop(0.85, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0.06)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  return Texture.from(c);
}

export function bakeVignetteTexture() {
  const W = tankW();
  const H = tankH();
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const diag = Math.hypot(W, H);
  const grad = ctx.createRadialGradient(W / 2, H / 2, diag * 0.22, W / 2, H / 2, diag * 0.56);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  return Texture.from(c);
}

export function makeNoiseTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = 128
        + 60 * Math.sin(x * 0.22) * Math.cos(y * 0.18)
        + 40 * Math.sin((x + y) * 0.11)
        + 25 * Math.cos(x * 0.07 - y * 0.13);
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = Math.max(0, Math.min(255, v));
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = Texture.from(c);
  tex.source.style.addressMode = 'repeat';
  return tex;
}

export class LightShafts {
  constructor() {
    this.g = new Graphics();
    this.g.blendMode = 'add';
    this.W = 448;
    this.H = 368;
    this.lastBuild = -1;
    this.dirty = true;
  }

  setDims(w, h) {
    this.W = w;
    this.H = h;
    this.dirty = true;
  }

  update(clock) {
    // the shafts drift over ~10s timescales; rebuilding the geometry 10x/s
    // is indistinguishable and skips most of the per-frame path building
    if (!this.dirty && clock - this.lastBuild < 0.1) return;
    this.dirty = false;
    this.lastBuild = clock;
    const { W, H } = this;
    const xs = Math.min(1.8, Math.max(1, W / 448));
    this.g.clear();
    for (let i = 0; i < 3; i++) {
      const baseX = W * (0.156 + i * 0.324) + Math.sin(clock * 0.07 + i * 2.1) * 34 * xs;
      const wTop = (40 + i * 12) * xs;
      const wBot = (85 + i * 18) * xs;
      const lean = Math.sin(clock * 0.05 + i * 1.3) * 22 * xs;
      const a = 0.05 + 0.035 * Math.sin(clock * 0.33 + i * 1.7);
      this.g.poly([
        baseX - wTop / 2, 0,
        baseX + wTop / 2, 0,
        baseX + lean + wBot / 2, H,
        baseX + lean - wBot / 2, H
      ]).fill({ color: 0xbfe8f0, alpha: Math.max(0.02, a) });
      this.g.poly([
        baseX - wTop / 6, 0,
        baseX + wTop / 6, 0,
        baseX + lean + wBot / 6, H,
        baseX + lean - wBot / 6, H
      ]).fill({ color: 0xdff4f8, alpha: Math.max(0.015, a * 0.7) });
    }
  }
}
