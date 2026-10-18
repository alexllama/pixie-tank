let W = 448;
let H = 368;
let samples = null;
let base = 352;
const STEP = 6;

function dunes(x) {
  return 6.5 * Math.sin(x / 97 + 1.3)
       + 4.5 * Math.sin(x / 43 + 4.1)
       + 2.5 * Math.sin(x / 19 + 2.35)
       + 9 * Math.exp(-Math.pow((x - W * 0.3) / (W * 0.11), 2))
       - 5 * Math.exp(-Math.pow((x - W * 0.6) / (W * 0.07), 2));
}

export function setTerrain(w, h) {
  W = Math.max(320, Math.round(w));
  H = Math.max(240, Math.round(h));
  base = H - 16;
  samples = [];
  const n = Math.ceil(W / STEP) + 2;
  for (let i = 0; i < n; i++) {
    const x = i * STEP;
    let y = base - dunes(x);
    if (y > H - 8) y = H - 8;
    if (y < H * 0.72) y = H * 0.72;
    samples.push(y);
  }
}

export const tankW = () => W;
export const tankH = () => H;
export const groundBase = () => base;

export function groundY(x) {
  if (!samples) return H - 16;
  const t = x / STEP;
  const i = Math.floor(t);
  if (i < 0) return samples[0];
  if (i >= samples.length - 1) return samples[samples.length - 1];
  const f = t - i;
  return samples[i] + (samples[i + 1] - samples[i]) * f;
}
