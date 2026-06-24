// ============================================================================
//  BRAINROT ZOO — bootstrap & main loop.
//  Wires the zoo economy, the chaotic 2D-employee office and the UI; runs the
//  tick; handles offline progress; tutorial NPC + Orca Tank offers; celebration.
// ============================================================================

import { initScene, getScene, onFrame, rotateCamera, zoomCamera } from './world/scene.js';
import { initOffice, setScreenData } from './world/office.js';
import { initEffects, updateEffects, confettiBurst, screenShake, floatingText } from './world/effects.js';
import { tick, computeOffline, getRates, getViralTimer, initLevel } from './sim/economy.js';
import { checkQuests, QUESTS } from './sim/quests.js';
import { checkAchievements } from './sim/achievements.js';
import { loadState, saveState, resetState, importSave, state } from './core/state.js';
import { ECON, RARITIES, DEPARTMENTS, UPGRADES, STATION_BY_ID } from './core/config.js';
import { bus } from './core/events.js';
import { money, fmt, duration } from './core/format.js';
import { el } from './ui/dom.js';
import { initHud, update as updateHud } from './ui/hud.js';
import { initPanels, refresh as refreshPanels } from './ui/panels.js';
import { initToasts, toast, banner, modal } from './ui/toast.js';
import { initGacha, openGacha, refreshGacha } from './ui/gacha.js';
import { showMenu } from './ui/menu.js';
import { startTutorial, orcaTankOffer, dealerOffer, employeeProblem } from './ui/dialogue.js';
import { unlockAudio, sBuy, sLevel, sViral, sAchieve, sReveal } from './core/sfx.js';

let office, pendingOffline = null, isFresh = false, playing = false;

function start() {
  initScene(document.getElementById('scene'));
  initEffects(getScene());
  window.addEventListener('pointerdown', unlockAudio, { once: true }); // WebAudio needs a gesture

  const { fresh } = loadState();
  isFresh = fresh;
  initLevel();
  office = initOffice(getScene());
  pendingOffline = fresh ? null : computeOffline((Date.now() - state.lastSeen) / 1000);

  const ui = document.getElementById('ui');
  initToasts();
  initHud(ui);
  initPanels(ui);
  initGacha(ui);
  buildCameraControls(ui);

  wireEvents();
  startLoop();

  showMenu({ fresh, onPlay: startGame, onTutorial: () => startTutorial(), onReset: confirmReset, onLoad: loadSaveFlow });
}

// Paste a save code to load a game (works from the menu or settings).
function loadSaveFlow() {
  const ta = el('textarea', { class: 'save-box', rows: '3', placeholder: 'Paste a save code…' });
  modal({
    title: '📥 Load Save',
    bodyNodes: [el('p', { class: 'modal-text', text: 'Paste a save code to load that game. This replaces your current zoo.' }), ta],
    actions: [
      { label: 'Load Save', primary: true, onClick: () => { try { importSave(ta.value); toast('Save loaded! Reloading…', { icon: '📥' }); setTimeout(() => location.reload(), 700); } catch { toast('Invalid save code.', { icon: '🚫', color: '#ff7a7a' }); } } },
      { label: 'Cancel' },
    ],
  });
}

function startGame() {
  playing = true;
  if (isFresh) setTimeout(() => startTutorial(), 400);
  else if (pendingOffline) { showOffline(pendingOffline); pendingOffline = null; }
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

function wireEvents() {
  bus.on('viral', ({ multiplier }) => { banner('VIRAL MOMENT!', `The whole zoo is trending (${multiplier || ECON.viralMultiplier}× income)`, { icon: '🔥' }); screenShake(1.2); flash('rgba(255,120,60,.35)'); confettiBurst(office.randomCelebrationPos(), 140, 1.2); });
  bus.on('milestone', (ms) => { banner(ms.label, ms.blurb, { icon: '🎉' }); for (let i = 0; i < 3; i++) setTimeout(() => confettiBurst(office.randomCelebrationPos(), 120, 1.2), i * 160); });

  bus.on('pull', ({ results }) => {
    const RANK = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4, gold: 5, diamond: 6 };
    let best = 0, bestChar = null;
    for (const r of results) if (RANK[r.char.rarity] >= best) { best = RANK[r.char.rarity]; bestChar = r.char; }
    sReveal(best);
    if (best >= 3 && bestChar) { confettiBurst(office.randomCelebrationPos(), 200, 1.4); screenShake(1.6); flash('rgba(255,210,120,.4)'); banner(`${RARITIES[bestChar.rarity].name.toUpperCase()}!`, bestChar.name, { icon: '🌟' }); }
  });

  bus.on('questComplete', ({ quest, reward }) => {
    const parts = []; if (reward.tokens) parts.push(`${reward.tokens} 🎟️`); if (reward.coins) parts.push(money(reward.coins));
    banner('Quest complete!', `${quest.title} · +${parts.join('  +')}`, { icon: '🎯' });
    confettiBurst(office.randomCelebrationPos(), 110, 1.1);
  });

  bus.on('deskUpgraded', () => toast('Workstations upgraded ✨', { icon: '⬆️', color: '#56cfe1' }));
  bus.on('officeExpanded', () => { toast('Office expanded — more room for chaos!', { icon: '🏢' }); screenShake(0.8); });
  bus.on('upgradeBought', ({ id }) => { if (id === 'autopilot') { banner('AUTO-PILOT ONLINE', 'Your stations now run themselves!', { icon: '⚙️' }); confettiBurst(office.randomCelebrationPos(), 120, 1.2); } else toast('Upgrade purchased ⬆️', { icon: '⬆️', color: '#56cfe1' }); });
  bus.on('stationBuilt', ({ id, count }) => { const s = STATION_BY_ID[id]; toast(`${s.icon} ${s.name} built (×${count})`, { icon: '🏭', color: s.uiColor }); screenShake(0.4); });

  bus.on('levelUp', ({ level }) => {
    banner(`LEVEL ${level}!`, 'Company leveled up — all income boosted', { icon: '🎖️' });
    screenShake(0.9); confettiBurst(office.randomCelebrationPos(), 110, 1.2);
    const dep = DEPARTMENTS.find((d) => d.unlockLevel === level); if (dep) toast(`Unlocked department: ${dep.icon} ${dep.name}!`, { icon: '🔓', color: '#49e07d', ms: 4500 });
    const up = UPGRADES.find((u) => u.unlockLevel === level); if (up) toast(`Upgrade unlocked: ${up.icon} ${up.name}!`, { icon: '🔓', color: '#56cfe1', ms: 4500 });
  });
  bus.on('achievement', ({ ach }) => {
    const r = []; if (ach.reward.tokens) r.push(`${ach.reward.tokens}🎟️`); if (ach.reward.coins) r.push(money(ach.reward.coins));
    banner(`🏅 ${ach.name}`, `${ach.desc} · +${r.join('  +')}`, { icon: '🏅' });
    confettiBurst(office.randomCelebrationPos(), 120, 1.2);
  });

  // Sound feedback (procedural, mutable). Multiple bus listeners are fine.
  for (const ev of ['hired', 'deskUpgraded', 'decoAdded', 'upgradeBought', 'stationBuilt', 'officeExpanded']) bus.on(ev, () => sBuy());
  bus.on('levelUp', () => sLevel());
  bus.on('viral', () => sViral());
  bus.on('milestone', () => sAchieve());
  bus.on('questComplete', () => sAchieve());
  bus.on('achievement', () => sAchieve());

  bus.on('ui:gacha', () => openGacha());
  bus.on('ui:quests', () => showQuests());
}

function startLoop() {
  let saveTimer = 0, panelTimer = 0, floatTimer = 0, metaTimer = 0, orcaTimer = 300, eventTimer = 240;
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
    if (metaTimer <= 0) { metaTimer = 0.4; checkQuests(); checkAchievements(); }

    floatTimer -= dt;
    if (floatTimer <= 0) {
      floatTimer = 0.6;
      if (floatCoins > 0) { floatingText(office.randomCelebrationPos(), '+' + money(floatCoins), getViralTimer() > 0 ? '#ffd166' : '#ffe08a'); floatCoins = 0; }
    }

    if (playing) {
      orcaTimer -= dt; if (orcaTimer <= 0) { orcaTimer = 300 + Math.random() * 180; orcaTankOffer(); }
      eventTimer -= dt;
      if (eventTimer <= 0) {
        eventTimer = 240 + Math.random() * 150;
        if (Math.random() < 0.5) dealerOffer({ onMess: (n) => { office.makeMess(n); screenShake(0.5); } });
        else employeeProblem({ onTantrum: () => { office.ragdollSome(2); office.makeMess(2); screenShake(0.9); } });
      }
    }

    saveTimer -= dt;
    if (saveTimer <= 0) { saveTimer = ECON.saveInterval; saveState(); }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) saveState();
    else { const s = computeOffline((Date.now() - state.lastSeen) / 1000); if (s) toast(`Welcome back! +${money(s.money)} while away`, { icon: '👋', ms: 4500 }); }
  });
}

function showQuests() {
  const rows = QUESTS.map((q, i) => {
    const done = i < state.questStep, cur = i === state.questStep;
    const reward = []; if (q.reward.tokens) reward.push(`${q.reward.tokens}🎟️`); if (q.reward.coins) reward.push(money(q.reward.coins));
    return el('div', { class: `quest-li ${done ? 'done' : cur ? 'cur' : 'locked'}` }, [
      el('div', { class: 'quest-li-ico', text: q.icon }),
      el('div', { class: 'quest-li-main' }, [el('div', { class: 'quest-li-title', text: q.title }), el('div', { class: 'quest-li-desc', text: `${q.desc} · ${reward.join(' ')}` })]),
      el('div', { class: 'quest-li-status', text: done ? '✓' : cur ? '▶' : '🔒' }),
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

function flash(color) {
  const f = el('div', { class: 'screen-flash' }); f.style.background = color;
  document.body.appendChild(f);
  requestAnimationFrame(() => f.classList.add('go'));
  setTimeout(() => f.remove(), 650);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
