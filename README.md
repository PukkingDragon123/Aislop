# 🤖 AI Slop.co

> A cozy **3D isometric idle tycoon** where you grow a tiny AI-content startup into
> the world's largest slop empire. Hire staff, balance your production pipeline,
> launch AI products, decorate the office, and watch your little workers shuffle
> tablets around a living, breathing studio.

Built with **Three.js** and **zero art assets** — every desk, worker, plant and
glowing AI core is generated procedurally from code. Runs entirely in the
browser, saves locally, and earns while you're away.

---

## ▶️ Run it

ES modules can't load over `file://`, so the game needs to be served over HTTP.
A tiny zero-dependency server is included:

```bash
npm start            # → http://localhost:8080
# or pick a port:
node serve.js 3000
```

No build step, no `npm install` (Three.js is vendored in `src/vendor/`).

Any static server works too:

```bash
python3 -m http.server 8080      # then open http://localhost:8080
npx serve .                      # if you prefer
```

Then open the URL in any modern browser (desktop or mobile).

---

## 🎮 How to play

You run an AI content company. Content flows through a **five-stage pipeline**,
laid out left-to-right across the office floor so you can literally watch the
chain work:

```
🔮 Trend Lab → ✨ Creation Bay → 🎬 Edit Suite → 🚀 Upload Hub → 📣 Growth Floor → 💰 + 👥
```

Each stage consumes the previous stage's output. **The slowest stage throttles
your entire company** — buffers visibly back up behind a bottleneck. So the core
game is *balancing your workforce across the five stages*, not just buying more
of one thing.

### The loop
1. **Hire staff** into each department (Staff tab). Watch the per-second rate and
   the ⚠️ **bottleneck** tag to see which stage to reinforce next.
2. **Upgrade desks** through five tiers — folding desk → dual-monitor → premium
   creator → futuristic AI → full **holographic** office. Each tier multiplies
   that department's output and visibly transforms the workstation.
3. **Launch AI products** (Videos, Songs, Ads, Websites, Study Tools, Games,
   Apps) as you hit follower milestones — each multiplies revenue & followers.
4. **Decorate** for morale, which boosts every department: plants, coffee
   machines, arcade corners, AI mascot statues, server displays, a glowing AI core.
5. **Expand the office** from a Garage Startup all the way to an AI Mega-Campus,
   unlocking more desk capacity and a bigger, fancier space.
6. **Go viral.** Random viral spikes (boosted by Brand Reputation) pour confetti
   across the office and multiply output 14× for a few seconds.
7. Buy **company-wide upgrades** (HR, Research, Cloud Servers, Brand, Algorithm
   Hacking, Sponsorships) to keep scaling.

Your empire **autosaves** locally and keeps earning while the tab is closed
(offline progress, capped at 8 hours).

### 🧬 The twist: Brainrot Fusion + the Doomscroll
What makes this *not* just another number-go-up idle game:

- **Hype ⚡** is a second currency earned from every published piece.
- In the **Lab**, fuse Hype to **discover Italian-brainrot characters** — Tralalero
  Tralala, Bombardiro Crocodilo, Tung Tung Tung Sahur, Ballerina Cappuccina and
  more (rarities Common → Mythic). It's a gacha-style collection: *gotta fuse 'em all.*
- Every character you collect adds a **permanent, compounding global multiplier**
  to all revenue & followers (a full set is a ~26× boost) — a whole second
  progression axis layered on top of the office.
- A **Trend** rotates every couple of minutes: while a character is trending,
  owning it grants a big temporary multiplier — so the meta keeps shifting and you
  chase the characters the algorithm wants *right now*.
- Tap the floating **📱 phone** to open the **Doomscroll** — an endless feed of
  **real-time procedurally-generated AI meme images** (drawn on canvas, no assets),
  with live like/view counters. Tap any post to **boost** it for bonus Hype & cash.
  New discoveries and viral moments burst into the feed.
- The giant office screen periodically takes over with full-screen animated
  brainrot, so the whole studio feels gloriously unhinged.

### Controls
- **Drag** — orbit the camera. **Pinch / scroll wheel** — zoom.
- On-screen **⟲ ⟳** buttons rotate, **＋ －** zoom.
- Bottom toolbar opens the shop sheets; **More ⚙️** has save export/import & reset.

---

## ✨ Features

- True **3D isometric** office rendered with an orthographic Three.js camera,
  soft shadows and cozy lighting.
- **Living office:** color-coded workers type at their desks, walk errands
  carrying glowing project tokens to the next department, and take coffee breaks.
- **Procedural everything:** 5 desk tiers, 10 decoration types, expressive
  low-poly characters, a live stats wall-screen (CanvasTexture) — all from code.
- **Real optimisation gameplay** via a buffered pipeline with back-pressure.
- **Juice:** confetti bursts, viral shockwaves, floating `+$` popups, celebratory
  milestone banners, ambient animation (spinning cores, blinking servers).
- **Modern, minimal, mobile-first UI** with glassy panels and bottom-sheet shops.
- Save export/import codes, offline earnings, "welcome back" summary.

### Polished mobile-game layer
- **Animated title screen** with drifting memes and a juicy Play / Continue button.
- **Guided tutorial** — a skippable coachmark tour that spotlights the real UI.
- **Quests** — a 10-step goal chain with a live HUD tracker and gem/cash/Hype rewards, so you always know what to do next.
- **Watch-ad rewards & gem store** (🛒) — watch a short parody ad for a free boost (2× income, instant cash, Hype, gems), or spend gems on bigger multipliers. Timed boosts show as live HUD chips. *Parody only — no real money.*
- **Mini-game** (🎮) — "Content Sprint", a 3-round timing QTE that pays out scaled to your timing (perfect runs grant a 2× boost).
- A second **neon "brainrot" visual register** for the menu, store, ads and mini-games, layered over the calm light "studio" UI.

---

## 🧱 Architecture

Plain ES modules, no framework, no bundler. Clean separation of **data → sim →
world → UI**, decoupled through a small event bus.

```
index.html              boot screen, canvas, UI mount
serve.js                zero-dep static server
styles/main.css         all UI styling
src/
  main.js               bootstrap + game loop + event→celebration wiring
  vendor/three.module.js  (vendored Three.js r160)
  core/
    config.js           ALL balance & content data (departments, tiers, products…)
    state.js            mutable state, save/load, cost formulas
    format.js           1.2K / $3.4M / "1h 4m" formatting
    events.js           tiny event bus
  sim/
    economy.js          the pipeline tick, viral, milestones, Hype, trends, offline
    actions.js          validated purchases (hire/upgrade/decorate/expand)
    fusion.js           Hype fusion → discover & collect brainrot characters
    brainrot.js         procedural "AI" meme image + Italian-brainrot name generator
    meta.js             quests, gems, watch-ad rewards, gem store, timed boosts, mini-game payouts
  world/
    scene.js            renderer, ortho iso camera, lights, orbit/zoom controls
    office.js           layout brain: lanes, desks, workers, decorations, screen
    furniture.js        procedural desk-tier & decoration meshes
    worker.js           the walking, typing low-poly character
    effects.js          confetti, floating text, viral shockwave
    screen.js           the live stats wall display
  ui/
    menu.js             polished animated title / main menu
    tutorial.js         first-run coachmark tour (spotlights real UI)
    hud.js              top bar: money / followers / Hype / gems + quest tracker, trend & boosts
    panels.js           toolbar + shop sheets (Staff/Lab/Products/Decor/Upgrades/Office)
    feed.js             the doomscroll: phone feed of live-generated brainrot posts
    store.js            watch-ad rewards + gem store + parody full-screen ad
    minigame.js         "Content Sprint" timing QTE
    toast.js            toasts, milestone banners, modals
    dom.js              tiny DOM helpers
```

The 3D office layout is **derived deterministically from save state** (just
numbers), so a save is a tiny JSON blob and the world can always be rebuilt.

### Tuning & extending
Almost everything is data-driven in `src/core/config.js`: add a department,
product, decoration, desk tier, upgrade or office level by editing the arrays —
the sim, world and UI pick it up automatically.

---

## 🛠️ Tech
- [Three.js](https://threejs.org/) r160 (vendored, MIT — see `src/vendor/THREE.LICENSE`)
- Vanilla ES modules, HTML5 Canvas, CSS. No dependencies to install.

## 📄 License
MIT.
