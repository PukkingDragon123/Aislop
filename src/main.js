// ============================================================================
//  AI SLOP.CO — bootstrap & main loop.
//  Wires the simulation, the 3D office and the UI together, runs the game tick,
//  handles offline progress, and turns sim events into on-screen celebration.
// ============================================================================

import { initScene, getScene, onFrame, rotateCamera, zoomCamera } from './world/scene.js';
import { initOffice, setScreenData } from './world/office.js';
import { initEffects, updateEffects, confettiBurst, viralBurst, floatingText } from './world/effects.js';
import { tick, computeOffline, getRates, getViralTimer } from './sim/economy.js';
import { loadState, saveState, state } from './core/state.js';
import { ECON } from './core/config.js';
import { bus } from './core/events.js';
import { money, fmt, duration } from './core/format.js';
import { el } from './ui/dom.js';
import { initHud, update as updateHud } from './ui/hud.js';
import { initPanels, refresh as refreshPanels } from './ui/panels.js';
import { initToasts, toast, banner, modal } from './ui/toast.js';

let office;
const boot = document.getElementById('boot');

function start() {
  const canvas = document.getElementById('scene');
  initScene(canvas);
  initEffects(getScene());

  const { fresh } = loadState();
  office = initOffice(getScene());

  // UI.
  const ui = document.getElementById('ui');
  initToasts();
  initHud(ui);
  initPanels(ui);
  buildCameraControls(ui);

  wireEvents();
  if (boot) { boot.classList.add('hide'); setTimeout(() => boot.remove(), 600); }

  if (fresh) {
    setTimeout(() => {
      toast('Welcome to your AI startup! Hire staff & balance the pipeline 🚀', { icon: '🤖', ms: 6000 });
    }, 800);
  } else {
    creditOffline();
  }

  startLoop();
}

// ---------------------------------------------------------------------------
//  Offline progress
// ---------------------------------------------------------------------------
function creditOffline() {
  const elapsed = (Date.now() - state.lastSeen) / 1000;
  const summary = computeOffline(elapsed);
  if (!summary) return;
  setTimeout(() => {
    modal({
      title: '👋 Welcome back!',
      bodyNodes: [
        el('p', { class: 'modal-text', html: `While you were away for <b>${duration(summary.seconds)}</b>, your company kept slopping:` }),
        el('div', { class: 'offline-grid' }, [
          el('div', { class: 'offline-stat' }, [el('div', { class: 'mini-val', style: { color: '#49e07d' }, text: '+' + money(summary.money) }), el('div', { class: 'mini-label', text: 'earned' })]),
          el('div', { class: 'offline-stat' }, [el('div', { class: 'mini-val', style: { color: '#6cc6ff' }, text: '+' + fmt(summary.followers) }), el('div', { class: 'mini-label', text: 'followers' })]),
        ]),
      ],
      actions: [{ label: 'Nice 🎉', primary: true }],
    });
  }, 900);
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
}

// ---------------------------------------------------------------------------
//  Main loop
// ---------------------------------------------------------------------------
function startLoop() {
  let saveTimer = 0, panelTimer = 0, floatTimer = 0;
  let floatMoney = 0, floatFollowers = 0;

  bus.on('published', (p) => { floatMoney += p.money; floatFollowers += p.followers; });

  onFrame((dt, t) => {
    tick(dt);
    office.update(dt, t);
    updateEffects(dt);
    setScreenData(getRates(), getViralTimer() > 0);

    updateHud();

    panelTimer -= dt;
    if (panelTimer <= 0) { panelTimer = 0.25; refreshPanels(); }

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

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
else start();
