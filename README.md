# 🦠 Brainrot Zoo

> A chaotic **3D idle gacha tycoon**. Run a digital zoo of AI "brainrot" creatures
> that print coins, **generate** new ones from a gacha, fuse duplicates to level
> them up, staff a wobbly office full of **3D googly-eyed potato employees** you
> can bully, and let your brainrots roam as **3D pets** that fight the staff.
> Built with **Three.js**, zero build step.

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
- **👆 Click to work:** tap the office (or your employees) for an instant coin
  payout — they pop and get to work. Buy the **🤖 Auto-Manager** upgrade to
  automate the clicking so it idles for you.
- **🏭 Stations:** build cookie-clicker machines (Render Farm, Meme Forge, Coin
  Mint…) then **tap them to run** for a burst of coins. Buy the **⚙️ Station
  Auto-Pilot** upgrade and they run themselves forever.
- **🧹 Mess & janitor:** trash piles up on the floor and **drags your income
  down** — tap it to sweep it, or buy a **Janitor Bot** to auto-clean.
- **🎟️ Tokens** come from **quests** — tap the quest chip up top to see your goal.
  Quests guide you and pay tokens (the gacha currency) + coins.
- **🛒 Build** (one Cookie-Clicker shop): staff, stations, decorations, desk
  upgrades, the whole upgrade tree and office expansions are **all one list,
  sorted cheapest → priciest** — there's always an obvious next buy. Just keep
  grabbing the top one. (**🏅 Goals** and **⚙️ More** sit in their own buttons so
  the shop stays clean.) Staff are **3D potato characters** with big stupid
  googly eyes and **drunk wobble physics** (spring-sway, stumbles, ragdoll
  flops). **Tap to make them work.**
- **🦓 Pets & chaos:** **45 collectible brainrots**, and your owned ones **roam
  the floor as little 3D creatures** — rarity-coloured blobs with googly eyes,
  crowns/halos for the rare ones — wandering, hopping and **attacking employees**.
  Buy chaos props — a **🦖 Office Dino**, a **🧨 TNT Crate**, a **🥊 Bully-Bot** —
  and **tap them** to detonate / stomp / whip everyone flat. Plus a ☕ coffee
  machine and 🍔 snack bar for the staff.
- **🐋 Events:** an investor **🐋 Orca Tank** pitch, a **🦝 Sketchy Dealer** with
  risky deals (mystery crates, double-or-nothing), and **🧑‍💻 employee problems**
  (pay them off, throw a pizza party, or ignore it and watch the meltdown).
  A tutorial NPC shows you the ropes on first run.
- **📥 Saves:** everything **autosaves** locally; **Load Save** (menu or settings)
  imports a save code, and you keep earning **offline** (capped at 8h).
- **📈 Progression:** lifetime coins are **XP** — your **company Level** ticks up
  (bar in the HUD), giving a permanent income bonus and **unlocking new
  departments & upgrades** as you climb. Buy a tree of permanent **Upgrades**
  (better GPUs, training, lucky rolls, offline servers…) and chase **20+
  Achievements**, each paying tokens or coins.
- **🔥 Viral** moments randomly multiply income; everything **autosaves** and keeps
  earning **offline** (capped at 8h, with a welcome-back summary).

### Brainrot art
Every character renders as charming **procedural art** out of the box. Each roster
entry in `src/core/config.js` also has an `img` field — drop in an image URL (e.g.
a **Higgsfield** render) and the game uses it automatically for that character's
gacha card, collection tile and the office screen.

---

## ✨ Highlights
- Real **gacha** with 7 weighted rarities (Common → Mythic → **Gold → Diamond**)
  and a dramatic summon (charging orb, burst flash, rarity-coloured cards, shake).
- **Duplicate-fusion** leveling — a satisfying "almost there" collection loop.
- **Chaos employees:** round, squishy, googly-eyed; sloppy wobble-walk, ragdoll
  flops, fights and thrown objects with arc physics; camera shake on big hits.
- **3D potato employees** with googly eyes and drunk, spring-physics wobble walks,
  ragdoll flops, fights and thrown objects.
- **Cookie-clicker + idle hybrid:** tap to earn, automate it, and watch a big
  **income/sec** readout up top. Smaller, faster progression steps.
- **Deep progression:** company Level/XP with steady unlocks, a leveled Upgrades
  tree (incl. Click Power, Auto-Manager, Lucky Rolls), 20+ achievements, and
  **functional decorations** (Cash Printer, Hype Billboard…).
- **Clean flat UI:** bright, solid colours, no gradients, no loading screen —
  designed to feel hand-made and polished.
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
  main.js               bootstrap, game loop, chaos/celebration wiring
  vendor/three.module.js
  core/
    config.js           ALL data: departments, desk tiers, decorations, offices,
                        RARITIES, ROSTER (+img), QUESTS, ECON tuning
    state.js            coins/tokens/collection(levels) state, save/load, costs
    format.js · events.js
  sim/
    economy.js          zoo income, employee/morale/audience mults, viral, offline
    gacha.js            weighted pulls, duplicate-fusion leveling, costs
    quests.js           token-awarding quest chain
    achievements.js     20+ one-time achievements with rewards
    actions.js          build verbs (hire / upgrade / decorate / expand)
    brainrot.js         procedural meme art + names; charArt() (img-or-procedural)
  world/
    scene.js            ortho iso camera, lights, controls, camera shake
    office.js           builds the zoo; roaming pets; chaos director; tap-to-bully; wall screen
    worker.js           3D potato employee (googly eyes, drunk wobble physics)
    furniture.js · screen.js · effects.js (confetti, floating text, shake, thrown objects)
  ui/
    hud.js              coins/tokens/followers, quest tracker
    dialogue.js         NPC dialogue runner — tutorial + Orca Tank offers
    gacha.js            generate screen + rarity reveal + collection grid
    panels.js           build sheets + settings
    menu.js · toast.js · dom.js
```

Everything is data-driven in `config.js` — add a brainrot, quest, decoration or
desk tier by editing an array.

## 📄 License
MIT. Three.js is MIT (see `src/vendor/THREE.LICENSE`).
