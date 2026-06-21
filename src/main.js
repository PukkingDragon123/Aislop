// ============================================================================
//  BRAINROT ZOO — bootstrap & main loop.
//  Wires the zoo economy, the chaotic 3D office and the UI; runs the tick;
//  handles offline progress; and turns events into maximum dopamine.
// ============================================================================

import { initScene, getScene, onFrame, rotateCamera, zoomCamera } from './world/scene.js';
import { initOffice, setScreenData } from './world/office.js';
import { initEffects, updateEffects, confettiBurst, viralBurst, floatingText, screenShake } from './world/effects.js';
import { tick, computeOffline, getRates, getViralTimer, getDopamine, triggerDopamine, addDopamine } from './sim/economy.js';
import { checkQuests, currentQuest, QUESTS } from './sim/quests.js';
import { loadState, saveState, resetState, state } from './core/state.js';
import { ECON, RARITIES } from './core/config.js';
import { bus } from './core/events.js';
import { money, fmt, duration } from './core/format.js';
import { el } from './ui/dom.js';
import { initHud, update as updateHud } from './ui/hud.js';
import { initPanels, refresh as refreshPanels, openTab } from './ui/panels.js';
import { initToasts, toast, banner, modal } from './ui/toast.js';
import { initGacha, openGacha, refreshGacha } from './ui/gacha.js';
import { showMenu } from './ui/menu.js';

let office, pendingOffline = null, spikeBtn = null;
const boot = document.getElementById('boot');

function start() {
  initScene(document.getElementById('scene'));
  initEffects(getScene());

  const { fresh } = loadState();
  office = initOffice(getScene());
  pendingOffline = fresh ? null : computeOffline((Date.now() - state.lastSeen) / 1000);

  const ui = document.getElementById('ui');
  initToasts();
  initHud(ui);
  initPanels(ui);
  initGacha(ui);
  buildCameraControls(ui);
  buildDopamineButton(ui);

  wireEvents();
  startLoop();
  if (boot) { boot.classList.add('hide'); setTimeout(() => boot.remove(), 600); }

  showMenu({ fresh, onPlay: startGame, onTutorial: showHowTo, onReset: confirmReset });
}

function startGame() { if (pendingOffline) { showOffline(pendingOffline); pendingOffline = null; } }

function showHowTo() {
  modal({
    title: '🦠 How to play',
    bodyNodes: [el('div', { class: 'howto' }, [
      el('p', { class: 'modal-text', html: '🎰 <b>Generate brainrots</b> (gacha) with the 🎰 button — they\'re your zoo and they print coins. Duplicates <b>fuse</b> and level up.' }),
      el('p', { class: 'modal-text', html: '🧑‍💻 <b>Build</b> your office (Staff/Decor/Office) — employees <b>multiply</b> all income.' }),
      el('p', { class: 'modal-text', html: '🎯 <b>Quests</b> pay <b>tokens</b> 🎟️ — the gacha currency. Tap the quest chip up top.' }),
      el('p', { class: 'modal-text', html: '🧠 Fill the <b>Dopamine</b> meter, then smash the <b>SPIKE</b> button for euphoric ×8 income.' }),
    ])],
    actions: [{ label: 'Let\'s go!', primary: true }],
  });
}

function showOffline(s) {
  setTimeout(() => modal({
    title: '👋 Welcome back!',
    bodyNodes: [
      el('p', { class: 'modal-text', html: `Your zoo earned for <b>${duration(s.seconds)}</b> while you were away:` }),
      el('div', { class: 'offline-grid' }, [
        el('div', { class: 'offline-stat' }, [el('div', { class: 'mini-val', style: { color: '#ffce47' }, text: '+' + money(s.money) }), el('div', { class: 'mini-label', text: 'coins' })]),
        el('div', { class: 'offline-stat' }, [el('div', { class: 'mini-val', style: { color: '#6cc6ff' }, text: '+' + fmt(s.followers) }), el('div', { class: 'mini-label', text: 'followers' })]),
      ]),
    ],
    actions: [{ label: 'Nice 🎉', primary: true }],
  }), 500);
}

// ---------------------------------------------------------------------------
function wireEvents() {
  bus.on('viral', () => { banner('VIRAL MOMENT!', `The whole zoo is trending (${ECON.viralMultiplier}× income)`, { icon: '🔥' }); screenShake(1.2); flash('rgba(255,120,60,.35)'); confettiBurst(office.randomCelebrationPos(), 140, 1.2); });
  bus.on('milestone', (ms) => { banner(ms.label, ms.blurb, { icon: '🎉' }); for (let i = 0; i < 3; i++) setTimeout(() => confettiBurst(office.randomCelebrationPos(), 120, 1.2), i * 160); });

  bus.on('pull', ({ results }) => {
    let best = 0; const RANK = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
    for (const r of results) best = Math.max(best, RANK[r.char.rarity]);
    addDopamine(0.12 + best * 0.05);
    if (best >= 3) { const r = results.find((x) => RANK[x.char.rarity] === best); confettiBurst(office.randomCelebrationPos(), 200, 1.4); screenShake(1.6); flash('rgba(255,210,120,.4)'); banner(`${RARITIES[r.char.rarity].name.toUpperCase()}!`, r.char.name, { icon: '🌟' }); }
  });

  bus.on('questComplete', ({ quest, reward }) => {
    const parts = []; if (reward.tokens) parts.push(`${reward.tokens} 🎟️`); if (reward.coins) parts.push(money(reward.coins));
    banner('Quest complete!', `${quest.title} · +${parts.join('  +')}`, { icon: '🎯' });
    confettiBurst(office.randomCelebrationPos(), 110, 1.1); addDopamine(0.2);
  });

  bus.on('dopamine', ({ multiplier, duration: d }) => {
    banner('🧠 DOPAMINE OVERLOAD', `Everything ×${multiplier} for ${d}s — GO FERAL`, { icon: '🤯' });
    screenShake(2.6); flash('rgba(255,46,154,.5)');
    for (let i = 0; i < 6; i++) setTimeout(() => confettiBurst(office.randomCelebrationPos(), 220, 1.5), i * 120);
  });

  bus.on('hired', () => { screenShake(0.25); });
  bus.on('deskUpgraded', () => toast('Workstations upgraded ✨', { icon: '⬆️', color: '#56cfe1' }));
  bus.on('officeExpanded', () => { toast('Office expanded — more room for chaos!', { icon: '🏢' }); screenShake(0.8); });
  bus.on('ui:gacha', () => openGacha());
  bus.on('ui:quests', () => showQuests());
}

// ---------------------------------------------------------------------------
function startLoop() {
  let saveTimer = 0, panelTimer = 0, floatTimer = 0, metaTimer = 0;
  let floatCoins = 0;
  bus.on('earn', (p) => { floatCoins += p.coins; });

  onFrame((dt, t) => {
    tick(dt);
    office.update(dt, t);
    updateEffects(dt);
    setScreenData(getRates(), getViralTimer() > 0);
    updateHud();

    panelTimer -= dt;
    if (panelTimer <= 0) { panelTimer = 0.25; refreshPanels(); refreshGacha(); }

    metaTimer -= dt;
    if (metaTimer <= 0) { metaTimer = 0.4; checkQuests(); updateSpikeButton(); }

    floatTimer -= dt;
    if (floatTimer <= 0) {
      floatTimer = 0.6;
      if (floatCoins > 0) {
        floatingText(office.randomCelebrationPos(), '+' + money(floatCoins), getDopamine().timer > 0 ? '#ff5db1' : (getViralTimer() > 0 ? '#ffd166' : '#ffe08a'));
        floatCoins = 0;
      }
    }
    saveTimer -= dt;
    if (saveTimer <= 0) { saveTimer = ECON.saveInterval; saveState(); }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveState();
    else {
      const s = computeOffline((Date.now() - state.lastSeen) / 1000);
      if (s) toast(`Welcome back! +${money(s.money)} while away`, { icon: '👋', ms: 4500 });
    }
  });
}

// ---------------------------------------------------------------------------
//  Dopamine spike button
// ---------------------------------------------------------------------------
function buildDopamineButton(container) {
  spikeBtn = el('button', { class: 'spike-btn hidden', onclick: () => { if (triggerDopamine()) {/* event handles juice */} }, html: '🧠 <b>DOPAMINE SPIKE</b> 🧠' });
  container.appendChild(spikeBtn);
}
function updateSpikeButton() {
  if (!spikeBtn) return;
  const d = getDopamine();
  spikeBtn.classList.toggle('hidden', !d.ready);
}

// ---------------------------------------------------------------------------
function showQuests() {
  const rows = QUESTS.map((q, i) => {
    const done = i < state.questStep, cur = i === state.questStep;
    const reward = []; if (q.reward.tokens) reward.push(`${q.reward.tokens}🎟️`); if (q.reward.coins) reward.push(money(q.reward.coins));
    const status = done ? '✓' : cur ? '▶' : '🔒';
    return el('div', { class: `quest-li ${done ? 'done' : cur ? 'cur' : 'locked'}` }, [
      el('div', { class: 'quest-li-ico', text: q.icon }),
      el('div', { class: 'quest-li-main' }, [el('div', { class: 'quest-li-title', text: q.title }), el('div', { class: 'quest-li-desc', text: `${q.desc} · ${reward.join(' ')}` })]),
      el('div', { class: 'quest-li-status', text: status }),
    ]);
  });
  modal({ title: '🎯 Quests', bodyNodes: [el('div', { class: 'quest-list' }, rows)], actions: [{ label: 'Close', primary: true }] });
}

function buildCameraControls(container) {
  const mk = (txt, fn) => el('button', { class: 'cam-btn', text: txt, onclick: fn });
  container.appendChild(el('div', { class: 'cam-controls' }, [
    mk('⟲', () => rotateCamera(-Math.PI / 8)), mk('＋', () => zoomCamera(0.82)),
    mk('－', () => zoomCamera(1.22)), mk('⟳', () => rotateCamera(Math.PI / 8)),
  ]));
}

function confirmReset() {
  modal({ title: 'Reset everything?', bodyNodes: [el('p', { class: 'modal-text', text: 'This wipes your whole zoo and starts over.' })], actions: [
    { label: 'Delete & restart', onClick: () => { resetState(); location.reload(); } }, { label: 'Cancel', primary: true },
  ] });
}

// Full-screen colour flash for big dopamine/viral hits.
function flash(color) {
  const f = el('div', { class: 'screen-flash' }); f.style.background = color;
  document.body.appendChild(f);
  requestAnimationFrame(() => f.classList.add('go'));
  setTimeout(() => f.remove(), 650);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
