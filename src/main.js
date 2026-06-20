// ============================================================================
//  AI SLOP.CO — bootstrap & main loop.
//  Wires the simulation, the 3D office and the UI together, runs the game tick,
//  handles offline progress, and turns sim events into on-screen celebration.
// ============================================================================

import { initScene, getScene, onFrame, rotateCamera, zoomCamera } from './world/scene.js';
import { initOffice, setScreenData } from './world/office.js';
import { initEffects, updateEffects, confettiBurst, viralBurst, floatingText } from './world/effects.js';
import { tick, computeOffline, getRates, getViralTimer, initTrend } from './sim/economy.js';
import { loadState, saveState, resetState, state } from './core/state.js';
import { ECON, RARITIES } from './core/config.js';
import { checkQuests, QUESTS, adAvailable, AD_REWARDS } from './sim/meta.js';
import { bus } from './core/events.js';
import { money, fmt, duration } from './core/format.js';
import { el } from './ui/dom.js';
import { initHud, update as updateHud } from './ui/hud.js';
import { initPanels, refresh as refreshPanels } from './ui/panels.js';
import { initToasts, toast, banner, modal } from './ui/toast.js';
import { initFeed, updateFeed } from './ui/feed.js';
import { initStore, openStore, refreshStore } from './ui/store.js';
import { openSprint } from './ui/minigame.js';
import { showMenu } from './ui/menu.js';
import { startTutorial } from './ui/tutorial.js';

let office;
let pendingOffline = null;
let storeBtn = null;
const boot = document.getElementById('boot');

function start() {
  const canvas = document.getElementById('scene');
  initScene(canvas);
  initEffects(getScene());

  const { fresh } = loadState();
  office = initOffice(getScene());
  initTrend(); // make sure a character is trending from the start

  // Credit offline progress now (before autosave can move lastSeen); show on Play.
  pendingOffline = fresh ? null : computeOffline((Date.now() - state.lastSeen) / 1000);

  // UI.
  const ui = document.getElementById('ui');
  initToasts();
  initHud(ui);
  initPanels(ui);
  initFeed(ui);
  initStore(ui);
  buildCameraControls(ui);
  buildActionButtons(ui);

  wireEvents();
  startLoop();
  if (boot) { boot.classList.add('hide'); setTimeout(() => boot.remove(), 600); }

  // Polished title screen gates the game; the office animates live behind it.
  showMenu({
    fresh,
    onPlay: startGame,
    onTutorial: () => startTutorial(),
    onReset: confirmReset,
  });
}

function startGame() {
  if (!state.tutorialDone) startTutorial();
  else if (pendingOffline) { showOffline(pendingOffline); pendingOffline = null; }
}

function confirmReset() {
  modal({
    title: 'Reset everything?',
    bodyNodes: [el('p', { class: 'modal-text', text: 'This wipes your whole company and starts over. No undo.' })],
    actions: [
      { label: 'Delete & restart', onClick: () => { resetState(); location.reload(); } },
      { label: 'Cancel', primary: true },
    ],
  });
}

// ---------------------------------------------------------------------------
//  Offline progress modal
// ---------------------------------------------------------------------------
function showOffline(summary) {
  setTimeout(() => {
    modal({
      title: '👋 Welcome back!',
      bodyNodes: [
        el('p', { class: 'modal-text', html: `While you were away for <b>${duration(summary.seconds)}</b>, your company kept slopping:` }),
        el('div', { class: 'offline-grid' }, [
          el('div', { class: 'offline-stat' }, [el('div', { class: 'mini-val', style: { color: '#49e07d' }, text: '+' + money(summary.money) }), el('div', { class: 'mini-label', text: 'earned' })]),
          el('div', { class: 'offline-stat' }, [el('div', { class: 'mini-val', style: { color: '#6cc6ff' }, text: '+' + fmt(summary.followers) }), el('div', { class: 'mini-label', text: 'followers' })]),
          el('div', { class: 'offline-stat' }, [el('div', { class: 'mini-val', style: { color: '#ffd166' }, text: '+' + fmt(summary.hype) }), el('div', { class: 'mini-label', text: 'hype ⚡' })]),
        ]),
      ],
      actions: [{ label: 'Nice 🎉', primary: true }],
    });
  }, 500);
}

// ---------------------------------------------------------------------------
//  Event → celebration wiring
// ---------------------------------------------------------------------------
function wireEvents() {
  bus.on('viral', () => {
    viralBurst(office.randomCelebrationPos());
    banner('VIRAL MOMENT!', `Your content is taking over the feed (${ECON.viralMultiplier}× output)`, { icon: '🔥' });
  });

  bus.on('milestone', (ms) => {
    banner(ms.label, ms.blurb, { icon: '🎉' });
    for (let i = 0; i < 3; i++) setTimeout(() => confettiBurst(office.randomCelebrationPos(), 120, 1.2), i * 180);
  });

  bus.on('productBought', () => { toast('New product line launched! 🚀', { icon: '🚀', color: '#ff9f45' }); confettiBurst(office.randomCelebrationPos(), 90); });
  bus.on('officeExpanded', () => { toast('Office expanded — more room to grow!', { icon: '🏢' }); });
  bus.on('deskUpgraded', () => { toast('Workstations upgraded ✨', { icon: '⬆️', color: '#56cfe1' }); });

  // Brainrot discovery — the big collection moment.
  bus.on('discovered', ({ char }) => {
    const r = RARITIES[char.rarity];
    banner(`${char.emoji.join('')}  ${char.name}`, `${r.name.toUpperCase()} brainrot discovered! +${Math.round(r.collectMult * 100)}% to everything, forever`, { icon: '✦' });
    for (let i = 0; i < 4; i++) setTimeout(() => confettiBurst(office.randomCelebrationPos(), 150, 1.3), i * 150);
  });
  bus.on('fused', ({ duplicate, refund, char }) => {
    if (duplicate) toast(`Duplicate ${char.name} — refunded ${fmt(refund)} ⚡`, { icon: '♻️', color: '#9aa6c0', ms: 2400 });
  });
  bus.on('trend', (t) => toast(`Trending now: ${t.emoji.join('')} ${t.name}`, { icon: '🔥', color: '#ff7a7a', ms: 4000 }));

  // Quest completion reward.
  bus.on('questComplete', ({ quest, reward }) => {
    const parts = [];
    if (reward.cash) parts.push(`$${fmt(reward.cash)}`);
    if (reward.hype) parts.push(`${fmt(reward.hype)} ⚡`);
    if (reward.gems) parts.push(`${reward.gems} 💎`);
    banner('Quest complete!', `${quest.title} · reward: +${parts.join('  +')}`, { icon: '🎯' });
    confettiBurst(office.randomCelebrationPos(), 110, 1.1);
  });

  // HUD shortcuts.
  bus.on('ui:store', () => openStore());
  bus.on('ui:quests', () => showQuests());
}

// ---------------------------------------------------------------------------
//  Main loop
// ---------------------------------------------------------------------------
function startLoop() {
  let saveTimer = 0, panelTimer = 0, floatTimer = 0, metaTimer = 0;
  let floatMoney = 0, floatFollowers = 0;

  bus.on('published', (p) => { floatMoney += p.money; floatFollowers += p.followers; });

  onFrame((dt, t) => {
    tick(dt);
    office.update(dt, t);
    updateEffects(dt);
    updateFeed(dt);
    setScreenData(getRates(), getViralTimer() > 0);

    updateHud();

    panelTimer -= dt;
    if (panelTimer <= 0) { panelTimer = 0.25; refreshPanels(); }

    metaTimer -= dt;
    if (metaTimer <= 0) { metaTimer = 0.5; checkQuests(); refreshStore(); updateStoreGlow(); }

    // Periodic floating earnings popups (accumulated, so we never spam).
    floatTimer -= dt;
    if (floatTimer <= 0) {
      floatTimer = 0.75;
      if (floatMoney > 0) {
        const pos = office.randomCelebrationPos();
        floatingText(pos, '+' + money(floatMoney), getViralTimer() > 0 ? '#ffd166' : '#7bffb0');
        floatMoney = 0; floatFollowers = 0;
      }
    }

    saveTimer -= dt;
    if (saveTimer <= 0) { saveTimer = ECON.saveInterval; saveState(); }
  });

  // Credit short tab-away gaps too.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { saveState(); }
    else {
      const elapsed = (Date.now() - state.lastSeen) / 1000;
      if (elapsed > 60) {
        const s = computeOffline(elapsed);
        if (s) toast(`Welcome back! +${money(s.money)} & +${fmt(s.followers)} followers while away`, { icon: '👋', ms: 5000 });
      }
    }
  });
}

// ---------------------------------------------------------------------------
//  On-screen camera controls
// ---------------------------------------------------------------------------
function buildCameraControls(container) {
  const mk = (txt, fn) => el('button', { class: 'cam-btn', text: txt, onclick: fn });
  container.appendChild(el('div', { class: 'cam-controls' }, [
    mk('⟲', () => rotateCamera(-Math.PI / 8)),
    mk('＋', () => zoomCamera(0.82)),
    mk('－', () => zoomCamera(1.22)),
    mk('⟳', () => rotateCamera(Math.PI / 8)),
  ]));
}

// ---------------------------------------------------------------------------
//  Floating action buttons (Store + Mini-game) — left rail above the feed.
// ---------------------------------------------------------------------------
function buildActionButtons(container) {
  storeBtn = el('button', { class: 'feed-fab act-store', onclick: openStore }, [el('span', { text: '🛒' })]);
  const game = el('button', { class: 'feed-fab act-game', onclick: openSprint }, [el('span', { text: '🎮' })]);
  container.append(storeBtn, game);
}

function updateStoreGlow() {
  if (!storeBtn) return;
  storeBtn.classList.toggle('ready', AD_REWARDS.some((a) => adAvailable(a.id)));
}

// ---------------------------------------------------------------------------
//  Quests list modal
// ---------------------------------------------------------------------------
function showQuests() {
  const rows = QUESTS.map((q, i) => {
    const done = i < state.questStep;
    const cur = i === state.questStep;
    const status = done ? '✓' : cur ? `${fmt(Math.min(q.cur(), q.target))}/${fmt(q.target)}` : '🔒';
    const reward = [];
    if (q.reward.cash) reward.push(`$${fmt(q.reward.cash)}`);
    if (q.reward.hype) reward.push(`${fmt(q.reward.hype)}⚡`);
    if (q.reward.gems) reward.push(`${q.reward.gems}💎`);
    return el('div', { class: `quest-li ${done ? 'done' : cur ? 'cur' : 'locked'}` }, [
      el('div', { class: 'quest-li-ico', text: q.icon }),
      el('div', { class: 'quest-li-main' }, [
        el('div', { class: 'quest-li-title', text: q.title }),
        el('div', { class: 'quest-li-desc', text: `${q.desc} · ${reward.join(' ')}` }),
      ]),
      el('div', { class: 'quest-li-status', text: status }),
    ]);
  });
  modal({ title: '🎯 Quests', bodyNodes: [el('div', { class: 'quest-list' }, rows)], actions: [{ label: 'Close', primary: true }] });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
