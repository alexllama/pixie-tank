export function createUI({ onAddFish, onRemoveFish, onFeed, onLight, onColors }) {
  const bar = document.createElement('div');
  bar.id = 'tank-toolbar';
  bar.innerHTML = `
    <button id="tb-minus" title="Remove a fish">−</button>
    <span id="tb-count">3</span>
    <button id="tb-plus" title="Add a fish">+</button>
    <button id="tb-feed" title="Drop food">Feed</button>
    <button id="tb-light" title="Cycle light: auto / day / night">Light: AUTO</button>
    <button id="tb-colors" title="New colors for every fish">Colors</button>
    <span id="tb-nextfeed"></span>
  `;
  document.body.appendChild(bar);

  const toggle = document.createElement('button');
  toggle.id = 'tank-toolbar-toggle';
  toggle.textContent = '⚙';
  toggle.title = 'Show controls (T)';
  document.body.appendChild(toggle);

  let visible = false;
  let hideTimer = null;
  const show = () => {
    bar.classList.add('visible');
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      bar.classList.remove('visible');
      visible = false;
    }, 5000);
  };
  const hide = () => {
    bar.classList.remove('visible');
    if (hideTimer) clearTimeout(hideTimer);
  };
  const setVisible = (v) => {
    visible = v;
    if (v) show(); else hide();
  };
  toggle.addEventListener('click', () => setVisible(!visible));
  bar.addEventListener('pointerenter', show);
  bar.addEventListener('pointerdown', show);

  document.getElementById('tb-plus').addEventListener('click', () => { onAddFish(); show(); });
  document.getElementById('tb-minus').addEventListener('click', () => { onRemoveFish(); show(); });
  document.getElementById('tb-feed').addEventListener('click', () => { onFeed(); show(); });
  document.getElementById('tb-light').addEventListener('click', () => { const m = onLight(); document.getElementById('tb-light').textContent = 'Light: ' + m.toUpperCase(); show(); });
  document.getElementById('tb-colors').addEventListener('click', () => { onColors(); show(); });

  window.addEventListener('keydown', (e) => {
    if (e.key === 't' || e.key === 'T') setVisible(!visible);
    else if (e.key === 'f' || e.key === 'F') onFeed();
  });

  return {
    setCount(n) { document.getElementById('tb-count').textContent = n; },
    setNextFeed(sec) {
      const el = document.getElementById('tb-nextfeed');
      if (sec <= 0) { el.textContent = 'feeding…'; return; }
      if (sec > 120) { el.textContent = ''; return; }
      el.textContent = `auto-feed ${Math.ceil(sec)}s`;
    },
    setLightLabel(m) { document.getElementById('tb-light').textContent = 'Light: ' + m.toUpperCase(); }
  };
}
