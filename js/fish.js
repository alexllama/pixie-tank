import { SPECIES } from './species.js';
import { groundY, tankW, tankH } from './terrain.js';

const FISH_THICK = 4.2;
const YAW_MIN = 0.06;

const BODY_LX = [16, 10, 2, -8, -15, -18, -15, -8, 2, 10];
const BODY_LY = [0, -7, -10, -9, -6, 0, 6, 9, 10, 7];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const yawEase = (y) => y * (1.5 - 0.5 * y * y);

function yawAt(yh, yt, lx) {
  let u = clamp((lx + 26) / 42, 0, 1);
  let s = yt + (yh - yt) * u;
  if (s > -YAW_MIN && s < YAW_MIN) s = s < 0 ? -YAW_MIN : YAW_MIN;
  return s;
}

function mix(c1, c2, t) {
  const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
  const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return (r << 16) | (g << 8) | b;
}

let fishIdCounter = 0;

export class Fish {
  constructor(opts = {}) {
    const sp = opts.species || SPECIES[(Math.random() * SPECIES.length) | 0];
    this.id = ++fishIdCounter;
    this.species = sp;
    this.size = (opts.size || 1) * sp.sizeMul * (0.9 + Math.random() * 0.2);
    this.x = opts.x ?? Math.random() * (tankW() - 80) + 40;
    this.y = opts.y ?? Math.random() * Math.max(30, groundY(this.x) - 80) + 40;
    this.vx = (Math.random() - 0.5) * 20;
    this.vy = (Math.random() - 0.5) * 10;
    this.speed = 20;
    this.yaw = Math.random() < 0.5 ? 1 : -1;
    this.yawTail = this.yaw;
    this.wander = Math.random() * 100;
    this.color = sp.bodyColors[(Math.random() * sp.bodyColors.length) | 0];
    this.fin = sp.finColors[(Math.random() * sp.finColors.length) | 0];
    this.accent = sp.accentColors[(Math.random() * sp.accentColors.length) | 0];
    this.hunger = 2 + Math.random() * 3;
    this.energy = 5 + Math.random() * 4;
    this.bored = Math.random() * 2;
    this.bold = 0.3 + Math.random() * 0.7;
    this.social = sp.schooliness * (0.6 + Math.random() * 0.4);
    this.curiosity = 0.3 + Math.random() * 0.7;
    this.goal = 'explore';
    this.goalAge = 0;
    this.decideIn = 1 + Math.random() * 4;
    this.target = null;
    this.dartTimer = 0;
    this.asleep = false;
    this.dying = false;
    this.deathT = 0;
    this.eaten = 0;
    this.followId = null;
    this.bubbleT = 0;
    this.seed = Math.random() * 1000;
  }

  get name() { return this.species.name; }

  update(dt, tank) {
    this.goalAge += dt;
    this.hunger = clamp(this.hunger + dt * 0.022, 0, 10);
    this.asleep = tank.night > 0.6 && (this.goal === 'rest' || this.energy < 3);
    if (this.asleep) this.energy = clamp(this.energy + dt * 0.5, 0, 10);
    else this.energy = clamp(this.energy - dt * 0.04 * (this.goal === 'dart_play' ? 3 : 1), 0, 10);
    if (this.goal !== 'seek_food' && this.goal !== 'rest') {
      this.bored = clamp(this.bored + dt * (10 / 55), 0, 10);
    }
    if (this.dartTimer > 0) this.dartTimer -= dt;

    this.decideIn -= dt;
    if (tank.hasFood && !this.asleep && this.goal !== 'seek_food' && this.hunger > 1.5 && this.decideIn > 1.5) {
      this.decideIn = 1.5;
    }
    if (this.decideIn <= 0 || this.bored > 8.5) this.decide(tank);

    const steer = this.steer(dt, tank);
    this.vx += steer.x * dt;
    this.vy += steer.y * dt;
    const spd = Math.hypot(this.vx, this.vy);
    const maxSpd = this.maxSpeed(tank);
    if (spd > maxSpd) { this.vx = (this.vx / spd) * maxSpd; this.vy = (this.vy / spd) * maxSpd; }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.speed = Math.hypot(this.vx, this.vy);

    const m = 14 + this.size * 10;
    if (this.x < m) { this.x = m; this.vx = Math.abs(this.vx); }
    if (this.x > tankW() - m) { this.x = tankW() - m; this.vx = -Math.abs(this.vx); }
    if (this.y < m) { this.y = m; this.vy = Math.abs(this.vy); }
    const fy = groundY(this.x) - 4;
    if (this.y > fy) { this.y = fy; this.vy = -Math.abs(this.vy); }

    if (Math.abs(this.vx) > 3) {
      const want = this.vx > 0 ? 1 : -1;
      if (want !== Math.sign(this.yaw)) {
        this.yaw = lerp(this.yaw, 0, clamp(dt * 6, 0, 1));
        if (Math.abs(this.yaw) < 0.12) this.yaw = want;
      } else {
        this.yaw = lerp(this.yaw, want, clamp(dt * 5, 0, 1));
      }
    } else {
      this.yaw = lerp(this.yaw, Math.sign(this.yaw || 1), clamp(dt * 2, 0, 1));
    }
    this.yawTail = lerp(this.yawTail, this.yaw, clamp(dt * 3.2, 0, 1));

    if (this.dying) {
      this.deathT += dt;
      this.vx *= 0.95; this.vy *= 0.95;
    }
  }

  maxSpeed(tank) {
    let s = 26 * this.species.speedMul;
    if (this.asleep) s *= 0.35;
    if (this.goal === 'dart_play' && this.dartTimer > 0) s *= 2.2;
    if (this.goal === 'seek_food') s *= 1.5;
    if (this.goal === 'rest') s *= 0.4;
    if (tank.night > 0.5 && this.goal !== 'seek_food') s *= 0.6;
    return s;
  }

  decide(tank) {
    const prev = this.goal;
    const w = {};
    const add = (k, v) => { w[k] = (w[k] || 0) + v; };
    add('explore', 2 + this.curiosity * 3 + this.bored * 0.5);
    add('follow_friend', 0.5 + this.social * 4 + this.bored * 0.3);
    add('visit_bubbles', 0.4 + this.curiosity * 1.5);
    add('dart_play', (this.energy > 5 ? 1.5 : 0.2) + this.bold * 2);
    add('rest', 0.6 + (10 - this.energy) * 0.6);
    add('seek_food', tank.hasFood
      ? 4 + this.curiosity * 3 + Math.max(0, this.hunger - 2) * 2
      : this.hunger > 5.5 ? (this.hunger - 5) * 2.2 : 0.15);
    if (tank.hasFood) w.rest = (w.rest || 0) * 0.3;
    if (tank.night > 0.5) {
      w.rest = (w.rest || 0) + 8 * tank.night;
      w.dart_play = (w.dart_play || 0) * 0.15;
      w.explore = (w.explore || 0) * 0.4;
      w.visit_bubbles = (w.visit_bubbles || 0) * 0.3;
      if (tank.hasFood) {
        w.rest = (w.rest || 0) * 0.4;
        w.seek_food = (w.seek_food || 0) * 0.5;
      }
    }
    let total = 0;
    for (const k in w) total += w[k];
    let r = Math.random() * total;
    let pick = 'explore';
    for (const k in w) { r -= w[k]; if (r <= 0) { pick = k; break; } }
    if (pick !== prev && pick !== 'seek_food' && pick !== 'rest') this.bored = Math.max(0, this.bored - 5);
    if (pick === prev) this.bored = Math.max(0, this.bored - 2);
    this.goal = pick;
    this.goalAge = 0;
    this.decideIn = 3 + Math.random() * 5;
    this.target = null;
    if (pick === 'dart_play') this.dartTimer = 1.2 + Math.random() * 1.5;
    if (pick === 'follow_friend') {
      const others = tank.fishes.filter((f) => f.id !== this.id && !f.dying);
      if (others.length) this.followId = others[(Math.random() * others.length) | 0].id;
      else { this.goal = 'explore'; this.decideIn = 2; }
    }
    if (pick === 'seek_food') this.target = null;
  }

  steer(dt, tank) {
    let ax = 0, ay = 0;
    const arrive = (tx, ty, slowR = 30) => {
      const dx = tx - this.x, dy = ty - this.y;
      const d = Math.hypot(dx, dy) + 0.001;
      const sp = this.maxSpeed(tank);
      const want = d < slowR ? (d / slowR) * sp : sp;
      ax += ((dx / d) * want - this.vx) * 2.4;
      ay += ((dy / d) * want - this.vy) * 2.4;
    };
    const wander = (amt) => {
      ax += Math.sin(tank.clock * 0.7 + this.seed) * amt;
      ay += Math.sin(tank.clock * 0.9 + this.seed * 1.7) * amt * 0.6;
    };

    switch (this.goal) {
      case 'seek_food': {
        let best = null, bd = 1e9;
        for (const f of tank.foods.pellets) {
          if (!f.alive) continue;
          const d = Math.hypot(f.x - this.x, f.y - this.y);
          if (d < bd) { bd = d; best = f; }
        }
        if (best) arrive(best.x, best.y, 8);
        else wander(18);
        break;
      }
      case 'follow_friend': {
        const friend = tank.fishes.find((f) => f.id === this.followId && !f.dying);
        if (friend) {
          const off = ((this.id * 37) % 20) - 10;
          arrive(friend.x + off, friend.y + ((this.id * 13) % 14) - 7, 16);
        } else wander(15);
        break;
      }
      case 'visit_bubbles': {
        this.bubbleT += dt;
        arrive(tank.bubbleX + Math.sin(this.bubbleT * 1.3 + this.seed) * 12,
               tankH() * 0.33 + Math.sin(this.bubbleT * 0.8 + this.seed) * 30, 14);
        break;
      }
      case 'dart_play': {
        if (!this.target || Math.hypot(this.target.x - this.x, this.target.y - this.y) < 12 || this.dartTimer <= 0) {
          const tx = 40 + Math.random() * (tankW() - 80);
          this.target = {
            x: tx,
            y: 40 + Math.random() * Math.max(30, groundY(tx) - 90)
          };
        }
        arrive(this.target.x, this.target.y, 10);
        break;
      }
      case 'rest': {
        if (!this.target) {
          const tx = 40 + Math.random() * (tankW() - 80);
          this.target = {
            x: tx,
            y: Math.max(40, groundY(tx) - 20 - Math.random() * 60)
          };
        }
        arrive(this.target.x, this.target.y, 8);
        wander(3);
        break;
      }
      default: {
        if (!this.target || Math.hypot(this.target.x - this.x, this.target.y - this.y) < 16 || this.goalAge > 12) {
          const z = tank.zoneStale();
          const vw = tank.vw || 448, vh = tank.vh || 368;
          const tx = clamp(z.x + (Math.random() - 0.5) * vw * 0.2, 25, vw - 25);
          const ty = clamp(z.y + (Math.random() - 0.5) * vh * 0.16, 25, groundY(tx) - 35);
          this.target = { x: tx, y: ty };
        }
        arrive(this.target.x, this.target.y, 14);
        wander(10);
      }
    }

    let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, n = 0;
    for (const o of tank.fishes) {
      if (o.id === this.id || o.dying) continue;
      const dx = this.x - o.x, dy = this.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 2500) {
        aliX += o.vx; aliY += o.vy; cohX += o.x; cohY += o.y; n++;
        if (d2 < 400 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (20 - d) / 20;
          sepX += (dx / d) * f * 60;
          sepY += (dy / d) * f * 60;
        }
      }
    }
    if (n > 0) {
      const s = this.social;
      const cohW = 0.13 * s * (this.goal === 'seek_food' ? 0.3 : 1);
      ax += ((aliX / n) - this.vx) * 0.8 * s;
      ax += (cohX / n - this.x) * cohW;
      ay += ((aliY / n) - this.vy) * 0.8 * s;
      ay += (cohY / n - this.y) * cohW;
    }
    ax += sepX * (0.4 + this.bold * 0.3);
    ay += sepY * (0.4 + this.bold * 0.3);
    if (this.y < 40) ay += (40 - this.y) * 3;
    const restFloor = groundY(this.x) - 26;
    if (this.y > restFloor) ay -= (this.y - restFloor) * 3;
    return { x: ax, y: ay };
  }
}

export function drawFish(g, f, clock) {
  const { size } = f;
  const fade = f.dying ? Math.max(0, 1 - f.deathT / 0.45) : 1;
  if (fade <= 0) return;
  const tail = Math.sin(clock * (8 + f.speed * 0.055) + f.wander) * (0.32 + f.speed * 0.007);
  const pale = f.hunger > 7 ? ((f.hunger - 7) / 3) * 0.35 : 0;
  const pitch = clamp(Math.atan2(f.vy, Math.abs(f.vx) + 1) * 0.55, -0.61, 0.61);
  const cp = Math.cos(pitch), spn = Math.sin(pitch);
  const yh = yawEase(f.yaw), yt = yawEase(f.yawTail);
  const TX = (lx, ly) => f.x + yawAt(yh, yt, lx) * (lx * cp - ly * spn) * size;
  const TY = (lx, ly) => f.y + (lx * spn + ly * cp) * size;

  const body = mix(mix(f.color, 0x7a8a8e, pale), 0x031015, (1 - fade) * 0.7);
  const fin = mix(mix(f.fin, 0x5a6a6e, pale), 0x031015, (1 - fade) * 0.7);
  const sp = f.species;

  const poly = (lxs, lys, color, a = 1) => {
    const pts = [];
    for (let i = 0; i < lxs.length; i++) pts.push(TX(lxs[i], lys[i]), TY(lxs[i], lys[i]));
    g.poly(pts).fill({ color, alpha: a * fade });
  };
  const ell = (lx, ly, rx, ry, color, a = 1, squashByYaw = true) => {
    const sm = yawAt(yh, yt, lx);
    const cx = TX(lx, ly), cy = TY(lx, ly);
    const rrx = squashByYaw
      ? Math.max(0.4, rx * Math.abs(sm) + (rx > 3 ? FISH_THICK * size * Math.sqrt(Math.max(0, 1 - sm * sm)) * 0.25 : 0))
      : Math.max(0.4, rx);
    g.ellipse(cx, cy, rrx, Math.max(0.4, ry)).fill({ color, alpha: a * fade });
  };

  const tailLen = sp.tail.len;
  const flap = tail * (sp.tail.type === 'veil' ? 1.5 : 1);
  if (sp.tail.type === 'veil') {
    poly([-10, -24 * tailLen, -22 * tailLen, -10], [0, -12 - flap * 10, 12 + flap * 10, 3], fin, 0.85);
  } else if (sp.tail.type === 'fan') {
    poly([-10, -24 * tailLen, -26 * tailLen, -24 * tailLen, -10],
         [0, -sp.tail.spread - flap * 6, 0, sp.tail.spread + flap * 6, 2], fin, 0.9);
  } else {
    poly([-10, -26 * tailLen, -26 * tailLen], [0, -sp.tail.spread - flap * 8, sp.tail.spread + flap * 8], fin);
  }

  if (sp.dorsal === 'small') {
    poly([6, -2, -9], [-8, -13, -8], fin, 0.9);
  } else if (sp.dorsal === 'tall') {
    poly([6, -1, -8], [-8, -16 + flap * 2, -8], fin, 0.85);
  } else if (sp.dorsal === 'veil') {
    poly([8, 0, -6, -12], [-8, -18 - flap * 4, -16 - flap * 3, -8], fin, 0.8);
  } else if (sp.dorsal === 'angel') {
    poly([6, 0, -4, -10], [-8, -24 - flap * 3, -22 - flap * 2, -8], fin, 0.85);
  }
  if (sp.anal === 'veil') {
    poly([4, -2, -8], [8, 16 + flap * 4, 10], fin, 0.75);
  } else if (sp.anal === 'angel') {
    poly([4, -2, -8], [8, 20 + flap * 3, 10], fin, 0.8);
  }

  const blx = BODY_LX.map((v) => v * (sp.id === 'angelfish' ? 0.85 : 1));
  const bly = BODY_LY.map((v) => (v / 10) * sp.bodyH);
  poly(blx, bly, body);

  const sm2 = yawAt(yh, yt, 2);
  const thickR = FISH_THICK * size * Math.sqrt(Math.max(0, 1 - sm2 * sm2));
  if (thickR >= 1) ell(2, 0, thickR, 9.5 * size * (sp.bodyH / 10), body, 1, false);

  if (sp.pattern === 'neon') {
    const s1 = Math.abs(yawAt(yh, yt, 4));
    if (s1 > 0.25) {
      ell(4, -1.5, 5.5 * s1, 1.6 * size + 0.6, 0x2fd8ff, 0.9 * s1);
      ell(-6, -1.5, 4.5 * s1, 1.5 * size + 0.5, 0xff5048, 0.85 * s1);
    }
  } else if (sp.pattern === 'zebra') {
    for (let i = -1; i <= 1; i++) {
      const lx = -2 + i * 6;
      const s1 = Math.abs(yawAt(yh, yt, lx));
      if (s1 > 0.25) ell(lx, 0, 2.2 * s1, sp.bodyH * 0.7, f.accent, 0.55 * s1);
    }
  } else if (sp.pattern === 'bars') {
    for (let i = -1; i <= 1; i++) {
      const lx = -4 + i * 5;
      const s1 = Math.abs(yawAt(yh, yt, lx));
      if (s1 > 0.3) ell(lx, 0, 1.6 * s1, sp.bodyH * 0.85, f.accent, 0.7 * s1);
    }
  }

  ell(3, 1.5, 3.2, sp.bodyH * 0.4, fin, 0.3);

  if (f.asleep) {
    ell(9, -3, 2.2, 0.7, 0x9fb4b8, 0.9, false);
  } else {
    ell(9, -3, 2.2, 2.2, 0xffffff, 1, false);
    ell(9.7, -3, 1.1, 1.1, 0x031015, 1, false);
  }
}
