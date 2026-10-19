import { Application, Container, Graphics, Sprite, BlurFilter, DisplacementFilter } from './pixi.js';
import { Fish, drawFish } from './fish.js';
import { makeBackGrass, makeFrontGrass } from './grass.js';
import { FoodSystem } from './food.js';
import { BubbleSystem } from './bubbles.js';
import { bakeSceneTexture, bakeVignetteTexture, bakeNightGradientTexture, makeNoiseTexture, LightShafts } from './scene.js';
import { lightingForDate, cycleLightMode } from './lighting.js';
import { createUI } from './ui.js';
import { setTerrain, groundY } from './terrain.js';

const REF_W = 448;
const REF_H = 368;
const REF_AREA = REF_W * REF_H;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

const app = new Application();
const dpr = window.devicePixelRatio || 1;
await app.init({ background: 0x000000, antialias: dpr <= 1, autoDensity: true, resolution: Math.min(dpr, 1.5) });
document.body.appendChild(app.canvas);
app.canvas.style.display = 'block';
app.ticker.maxFPS = 30; // the sim is smooth at 30fps and this halves render/CPU load

const world = new Container();
app.stage.addChild(world);

let VW = REF_W;
let VH = REF_H;
let maxFish = 15;

const sceneSprite = new Sprite(bakeSceneTexture());
world.addChild(sceneSprite);

const noiseTex = makeNoiseTexture(128);
const dispSprite = new Sprite(noiseTex);
dispSprite.renderable = false;
world.addChild(dispSprite);
const dispFilter = new DisplacementFilter({ sprite: dispSprite, scale: { x: 10, y: 7 } });
sceneSprite.filters = [dispFilter];

const shafts = new LightShafts();
world.addChild(shafts.g);

const nightBgBlack = new Sprite(bakeNightGradientTexture());
nightBgBlack.tint = 0x000000;
nightBgBlack.alpha = 0;
world.addChild(nightBgBlack);
const nightBgBlue = new Sprite(nightBgBlack.texture);
nightBgBlue.tint = 0x3a5a9a;
nightBgBlue.blendMode = 'multiply';
nightBgBlue.alpha = 0;
world.addChild(nightBgBlue);

const backGrassG = new Graphics();
world.addChild(backGrassG);
let backBeds = makeBackGrass();

const fishG = new Graphics();
world.addChild(fishG);

const frontGrassG = new Graphics();
const frontBlur = new BlurFilter({ strength: 2.2, quality: 1 });
frontGrassG.filters = [frontBlur];
world.addChild(frontGrassG);
let frontBeds = makeFrontGrass();
let grassDirty = true;
let lastGrassDraw = -1;

const vignetteSprite = new Sprite(bakeVignetteTexture());
world.addChild(vignetteSprite);

const nightTop = new Graphics().rect(0, 0, VW, VH).fill({ color: 0x000000 });
nightTop.alpha = 0;
world.addChild(nightTop);

const ZONE_FX = [0.14, 0.5, 0.86, 0.18, 0.52, 0.84];
const ZONE_FY = [0.22, 0.15, 0.26, 0.62, 0.58, 0.66];

const tank = {
  fishes: [],
  foods: new FoodSystem(),
  bubbles: new BubbleSystem(340),
  bubbleX: 340,
  clock: 0,
  night: 0,
  hasFood: false,
  zoneLast: new Array(6).fill(-999),
  zoneStale() {
    let best = 0, bv = Infinity;
    for (let i = 0; i < 6; i++) {
      if (this.zoneLast[i] < bv) { bv = this.zoneLast[i]; best = i; }
    }
    this.zoneLast[best] = this.clock;
    const x = VW * ZONE_FX[best];
    return { x, y: Math.min(VH * ZONE_FY[best], groundY(x) - 50) };
  }
};

// food and bubble views slot in between the back grass and the fish layer
const layerIdx = world.getChildIndex(fishG);
world.addChildAt(tank.foods.view, layerIdx);
world.addChildAt(tank.bubbles.view, layerIdx + 1);

function addFish(opts) {
  if (tank.fishes.length >= maxFish) return;
  const f = new Fish(opts);
  tank.fishes.push(f);
  ui.setCount(tank.fishes.length);
}

function removeFish() {
  const live = tank.fishes.filter((f) => !f.dying);
  if (live.length <= 1) return;
  const f = live[live.length - 1];
  f.dying = true;
  setTimeout(() => {
    const i = tank.fishes.indexOf(f);
    if (i >= 0) tank.fishes.splice(i, 1);
    ui.setCount(tank.fishes.filter((x) => !x.dying).length);
  }, 500);
}

function feedAt(x, y) {
  tank.foods.drop(x, y);
}

function pickDifferent(arr, cur) {
  if (arr.length < 2) return arr[0];
  let i;
  do { i = (Math.random() * arr.length) | 0; } while (arr[i] === cur);
  return arr[i];
}

function newColors() {
  for (const f of tank.fishes) {
    f.color = pickDifferent(f.species.bodyColors, f.color);
    f.fin = pickDifferent(f.species.finColors, f.fin);
    f.accent = pickDifferent(f.species.accentColors, f.accent);
  }
}

const ui = createUI({
  onAddFish: () => addFish(),
  onRemoveFish: () => removeFish(),
  onFeed: () => feedAt(VW * 0.14 + Math.random() * VW * 0.72, 8),
  onLight: () => cycleLightMode(),
  onColors: () => newColors()
});

app.canvas.addEventListener('pointerdown', (e) => {
  const rect = app.canvas.getBoundingClientRect();
  const sx = (e.clientX - rect.left) / rect.width * app.screen.width;
  const sy = (e.clientY - rect.top) / rect.height * app.screen.height;
  const wx = sx / world.scale.x;
  const wy = sy / world.scale.y;
  if (wx >= 0 && wx <= VW && wy >= 0 && wy <= groundY(wx)) feedAt(wx, wy);
});

function applyLayout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const z = Math.min(w / REF_W, h / REF_H);
  VW = clamp(Math.round(w / z), REF_W, 100000);
  VH = clamp(Math.round(h / z), REF_H, 100000);
  setTerrain(VW, VH);
  tank.vw = VW;
  tank.vh = VH;
  maxFish = clamp(Math.round(15 * (VW * VH) / REF_AREA), 15, 28);

  app.renderer.resize(w, h);
  world.scale.set(w / VW, h / VH);
  world.position.set(0, 0);

  sceneSprite.texture = bakeSceneTexture();
  sceneSprite.setSize(VW, VH);
  vignetteSprite.texture = bakeVignetteTexture();
  vignetteSprite.setSize(VW, VH);

  shafts.setDims(VW, VH);
  const nightTex = bakeNightGradientTexture();
  nightBgBlack.texture = nightTex;
  nightBgBlue.texture = nightTex;
  nightBgBlack.setSize(VW, VH);
  nightBgBlue.setSize(VW, VH);
  nightTop.clear().rect(0, 0, VW, VH).fill({ color: 0x000000 });

  backBeds = makeBackGrass();
  frontBeds = makeFrontGrass();
  grassDirty = true;

  tank.bubbleX = Math.round(VW * 0.758);
  tank.bubbles.columnX = tank.bubbleX;
}

let layoutQueued = false;
window.addEventListener('resize', () => {
  if (layoutQueued) return;
  layoutQueued = true;
  requestAnimationFrame(() => {
    layoutQueued = false;
    applyLayout();
  });
});

applyLayout();
for (let i = 0; i < 3; i++) addFish();

let lastAutoUi = 0;
let tickerErrorShown = false;
let litCache = { dim: 1, night: 0 };
let litTimer = 1e9;
app.ticker.add((ticker) => {
  try {
    tick(ticker);
  } catch (err) {
    if (!tickerErrorShown) {
      tickerErrorShown = true;
      console.error(err);
    }
  }
});

function tick(ticker) {
  const dt = Math.min(ticker.deltaMS / 1000, 0.1);
  tank.clock += dt;

  litTimer += dt;
  if (litTimer > 0.5) {
    litTimer = 0;
    litCache = lightingForDate();
  }
  const lit = litCache;
  tank.night = lit.night;
  const aBg = (1 - lit.dim) * 0.65;
  const aBlue = lit.night * 0.24;
  const aTop = (1 - lit.dim) * 0.45;
  nightBgBlack.alpha = aBg;
  nightBgBlue.alpha = aBlue;
  nightTop.alpha = aTop;
  nightBgBlack.renderable = aBg > 0.01;   // in daytime these are full-screen
  nightBgBlue.renderable = aBlue > 0.01;  // quads — skip drawing them
  nightTop.renderable = aTop > 0.01;

  tank.foods.autoFeed(dt);
  tank.foods.update(dt, tank.fishes);
  tank.hasFood = tank.foods.hasFood;
  tank.bubbles.update(dt, tank.clock);

  for (const f of tank.fishes) f.update(dt, tank);
  tank.fishes = tank.fishes.filter((f) => !f.dying || f.deathT < 0.45);

  shafts.update(tank.clock);

  // grass sway moves a few px/s — rebuilding its paths at 10Hz instead of
  // every frame is invisible and skips most of the per-frame tessellation
  if (grassDirty || tank.clock - lastGrassDraw >= 0.1) {
    grassDirty = false;
    lastGrassDraw = tank.clock;
    backGrassG.clear();
    for (const b of backBeds) b.draw(backGrassG, tank.clock);
    frontGrassG.clear();
    for (const b of frontBeds) b.draw(frontGrassG, tank.clock);
  }

  fishG.clear();
  for (const f of tank.fishes) drawFish(fishG, f, tank.clock);

  dispSprite.x = (tank.clock * 6) % 128;
  dispSprite.y = (tank.clock * 2.5) % 128;

  lastAutoUi += dt;
  if (lastAutoUi > 0.5) {
    lastAutoUi = 0;
    ui.setNextFeed(tank.foods.timeToNextAuto());
  }
}
