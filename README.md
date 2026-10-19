# pixie-tank

A browser aquarium inspired by [pocket-tank](https://github.com/mediacutlet/pocket-tank)'s porthole look: deep teal gradient water, drifting light shafts, swaying seagrass, a bubble column — and procedurally drawn tropical fish that turn like real fish (yaw foreshortening, head leading the tail), rendered with PixiJS.

The display **fills the entire browser window** — the tank's virtual size stretches to your window's aspect ratio, so there are no black bars, on any screen from portrait phones to ultrawide monitors.

No AI model, no build step, no image assets. Everything is drawn by code.

It's also built to stay **light on your machine**: the sim renders at a capped 30fps, sea grass redraws at 10Hz (its sway is slow), light shafts rebuild at 10Hz, bubbles and food pellets are sprite pools instead of per-frame path drawing, pixel ratio is capped at 1.5, and the night overlays aren't drawn during the day. That keeps the browser tab's CPU footprint small even on laptops.

## Features

- **Full-window rendering**: no letterboxing; resize the window and the whole scene re-bakes live.
- **Varied terrain**: a dune-profile sea floor (gentle sine dunes plus a raised sand bar and a dip), scattered pebble fields, three rock-cluster outcrops with algae, and a **sunken pirate shipwreck** — tilted hull, broken mast with tattered pennant, brass portholes, bowsprit — half-buried in a sand berm.
- **5 tropical species**, randomly picked when you add a fish:
  - Neon Tetra (slim, blue/red stripe, schools tightly)
  - Guppy (round body, big fan tail)
  - Betta (large flowing veil fins, solitary, slow)
  - Angelfish (tall body, long trailing fins, vertical bars)
  - Zebra Danio (fast, striped, schools)
- **Scripted goal AI + boids**: each fish independently picks goals (explore / rest / seek food / follow a friend / dart play / visit the bubbles), gets bored, schools by species personality — bettas wander alone, tetras and danios stick together.
- **Feeding**: click/tap the water to drop food; nearly every fish takes an interest right away — they break off what they're doing and chase the nearest pellet, and turn paler when really hungry. The tank also **auto-feeds once per hour** (first feed ~8s after load) to keep things moving.
- **Night mode** (automatic, follows your local time):
  - full color until 7 PM
  - ramp down 7–8 PM
  - muted night palette 8 PM – 6 AM (fish slow down and rest more)
  - ramp up 6–7 AM
  - the toolbar **Light** button cycles AUTO → DAY → NIGHT to override.
  - at night the water and backdrop stay dark, while fish, seagrass, and the sea floor only dim a little — your fish remain clearly visible.
- **Toolbar** (hidden by default — click ⚙ or press `T`): fish count −/+, Feed, Light mode, Colors (rerolls every fish to a visibly different on-theme palette). Auto-hides after 5s.

## Run locally

Serve the folder with any static server (ES modules need http, not file://):

```bash
cd pixie-tank
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy on GitHub Pages

1. Create a new GitHub repo and push these files:

   ```bash
   git init
   git add .
   git commit -m "pixie-tank"
   git branch -M main
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```

2. On GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: main / (root)**.
3. Your tank is live at `https://<you>.github.io/<repo>/`.

No build step — Pages serves the files as-is. PixiJS is loaded from the jsDelivr CDN.

## Controls

| Action | How |
|---|---|
| Feed | click/tap the water, or toolbar **Feed**, or key `F` |
| Add/remove fish | toolbar `+` / `−` |
| Toggle toolbar | ⚙ button or key `T` |
| Light mode | toolbar **Light** (AUTO / DAY / NIGHT) |
| New colors | toolbar **Colors** |

## Code layout

| File | What it does |
|---|---|
| `js/main.js` | app init, layers, full-window layout/resize, game loop |
| `js/terrain.js` | the shared sea-floor profile: `groundY(x)` dune curve that scene, grass, food, bubbles, and fish all follow |
| `js/scene.js` | water gradient + terrain fill + rocks + shipwreck + pebbles baked to a texture, vignette, light shafts, shimmer noise |
| `js/grass.js` | procedural seagrass beds with per-frond sway |
| `js/fish.js` | fish physics, goal AI, boids, and the procedural fish renderer (ported from pocket-tank's `draw_fish_core`: body polygon, flapping tail, yaw turning) |
| `js/species.js` | the 5 species definitions |
| `js/food.js` | pellets, eating, hourly auto-feeder |
| `js/bubbles.js` | bubble column + ambient bubbles |
| `js/lighting.js` | day/night dim schedule with ramps |
| `js/ui.js` | the toggleable toolbar |

## Credits

Fish shape, turn mechanics, water colors, and the overall porthole look are ported from [mediacutlet/pocket-tank](https://github.com/mediacutlet/pocket-tank) (MIT). This is an independent, lightweight re-implementation for the browser — not affiliated with that project.
