const NIGHT_DIM = 0.35;
const DAY_DIM = 1.0;

let mode = 'auto';

export function setLightMode(m) { mode = m; }
export function getLightMode() { return mode; }
export function cycleLightMode() {
  mode = mode === 'auto' ? 'day' : mode === 'day' ? 'night' : 'auto';
  return mode;
}

function smoothstep(t) { return t * t * (3 - 2 * t); }

export function lightingForDate(date = new Date()) {
  if (mode === 'day') return { dim: DAY_DIM, night: 0 };
  if (mode === 'night') return { dim: NIGHT_DIM, night: 1 };
  const h = date.getHours() + date.getMinutes() / 60;
  let dim;
  if (h < 6) dim = NIGHT_DIM;
  else if (h < 7) dim = NIGHT_DIM + (DAY_DIM - NIGHT_DIM) * smoothstep(h - 6);
  else if (h < 19) dim = DAY_DIM;
  else if (h < 20) dim = DAY_DIM - (DAY_DIM - NIGHT_DIM) * smoothstep(h - 19);
  else dim = NIGHT_DIM;
  const night = (DAY_DIM - dim) / (DAY_DIM - NIGHT_DIM);
  return { dim, night };
}
