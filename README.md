# 🦠 Brainrot Zoo

> A chaotic **3D idle gacha tycoon**. Run a digital zoo of AI "brainrot" creatures
> that print coins, **generate** new ones from a gacha, fuse duplicates to level
> them up, staff a wobbly googly-eyed office, and slam the **Dopamine Spike**
> button for euphoric ×8 overdrive. Built with **Three.js**, zero build step.

Three pillars, nothing else in the way:

1. **🪙 Tycoon** — your brainrots generate coins every second; employees multiply it.
2. **🧑‍💻 Build** — hire staff, upgrade desks, decorate, expand the office.
3. **🦓 Collect** — gacha for brainrots; duplicates fuse into higher levels.

---

## ▶️ Run it

ES modules need to be served over HTTP (not opened as a file). A zero-dependency
server is included:

```bash
npm start            # → http://localhost:8080
# or any static server:
python3 -m http.server 8080
```

No `npm install` — Three.js is vendored in `src/vendor/`.

---

## 🎮 How to play

- **🎰 Generate Brainrot** (the pink button, bottom-left): spend **tokens 🎟️ + coins 🪙**
  to pull a random brainrot. Rarer = more income. **Duplicates fuse** — they level
  up the one you own and earn more. Pull ×1 or ×10 and enjoy the rarity reveal.
- **🎟️ Tokens** come from **quests** — tap the quest chip up top to see your goal.
  Quests guide you and pay tokens (the gacha currency) + coins.
- **🧑‍💻 Build** (bottom toolbar — Staff / Decor / Office): employees **multiply all
  income**, decorations add morale, expanding unlocks more desks. The office is a
  living, chaotic zoo: round googly-eyed workers wobble around, get knocked flat
  (ragdoll), square up and **fling office supplies** at each other.
- **🧠 Dopamine Spike**: the meter up top fills as you earn. When it's full, a giant
  rainbow **SPIKE** button appears — smash it for **×8 income**, screen shake,
  confetti storms and a full-screen flash. Maximum overstimulation.
- **🔥 Viral** moments randomly multiply income; everything **autosaves** and keeps
  earning **offline** (capped at 8h, with a welcome-back summary).

### Brainrot art
Every character renders as charming **procedural art** out of the box. Each roster
entry in `src/core/config.js` also has an `img` field — drop in an image URL (e.g.
a **Higgsfield** render) and the game uses it automatically for that character's
gacha card, collection tile and the office screen.

---

## ✨ Highlights
- Real **gacha** with weighted rarities (Common → Mythic) and a staggered reveal
  (rarity glow, spinning rays, confetti, screen shake).
- **Duplicate-fusion** leveling — a satisfying "almost there" collection loop.
- **Chaos employees:** round, squishy, googly-eyed; sloppy wobble-walk, ragdoll
  flops, fights and thrown objects with arc physics; camera shake on big hits.
- **Dopamine system** built to be addictive: a fill meter + euphoric spike overdrive.
- 3D isometric office (orthographic Three.js camera, soft shadows), a live wall
  screen that cycles your top brainrots and full-screen memes, polished neon UI,
  animated title screen.

---

## 🧱 Architecture
Plain ES modules, no framework/bundler. Data → sim → world → UI, decoupled via a
tiny event bus. The 3D layout is derived from save state (just numbers).

```
index.html · serve.js · styles/main.css
src/
  main.js               bootstrap, game loop, dopamine/chaos celebration wiring
  vendor/three.module.js
  core/
    config.js           ALL data: departments, desk tiers, decorations, offices,
                        RARITIES, ROSTER (+img), QUESTS, ECON tuning
    state.js            coins/tokens/collection(levels) state, save/load, costs
    format.js · events.js
  sim/
    economy.js          zoo income, employee/morale/audience mults, viral, dopamine, offline
    gacha.js            weighted pulls, duplicate-fusion leveling, costs
    quests.js           token-awarding quest chain
    actions.js          build verbs (hire / upgrade / decorate / expand)
    brainrot.js         procedural meme art + names; charArt() (img-or-procedural)
  world/
    scene.js            ortho iso camera, lights, controls, camera shake
    office.js           builds the zoo; worker errands; chaos director; wall screen
    worker.js           round googly-eyed sloppy employee (walk/ragdoll/fight)
    furniture.js · screen.js · effects.js (confetti, floating text, shake, thrown objects)
  ui/
    hud.js              coins/tokens/followers, quest tracker, dopamine meter
    gacha.js            generate screen + rarity reveal + collection grid
    panels.js           build sheets + settings
    menu.js · toast.js · dom.js
```

Everything is data-driven in `config.js` — add a brainrot, quest, decoration or
desk tier by editing an array.

## 📄 License
MIT. Three.js is MIT (see `src/vendor/THREE.LICENSE`).
