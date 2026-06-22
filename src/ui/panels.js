// ============================================================================
//  Bottom toolbar + build sheets: Staff, Decor, Office (+ More/settings).
//  Employees multiply the zoo's income; decorations add morale; expanding the
//  office unlocks more desks.
// ============================================================================

import { el, clear } from './dom.js';
import {
  state, hireCost, deskUpgradeCost, decoCost, officeUpgradeCost, upgradeCost,
  capacity, totalWorkers, atCapacity, saveState, resetState, exportSave, importSave,
} from '../core/state.js';
import { DEPARTMENTS, DECORATIONS, DESK_TIERS, OFFICE_LEVELS, UPGRADES, ACHIEVEMENTS } from '../core/config.js';
import { fmt, money } from '../core/format.js';
import * as actions from '../sim/actions.js';
import { deptPower, computeModifiers, incomePerSec, collectionCount, companyLevel } from '../sim/economy.js';
import { achievementProgress, isUnlocked, unlockedCount } from '../sim/achievements.js';
import { bus } from '../core/events.js';
import { toast, modal } from './toast.js';

let sheet, sheetTitle, sheetBody, toolbar;
let isOpen = false;
let liveUpdaters = [];

// Everything — upgrades, staff, floor, decor, achievements — lives in ONE panel.
export function initPanels(container) {
  sheetTitle = el('div', { class: 'sheet-title', text: 'Manage Company' });
  sheetBody = el('div', { class: 'sheet-body' });
  sheet = el('div', { class: 'sheet manage hidden' }, [
    el('div', { class: 'sheet-head' }, [sheetTitle, el('button', { class: 'sheet-close', text: '✕', onclick: closeSheet })]),
    sheetBody,
  ]);
  toolbar = el('div', { class: 'toolbar' }, [
    el('button', { class: 'tool-btn big', onclick: toggleManage }, [el('span', { class: 'tool-ico', text: '🏗️' }), el('span', { class: 'tool-label', text: 'Manage' })]),
    el('button', { class: 'tool-btn', onclick: openSettings }, [el('span', { class: 'tool-ico', text: '⚙️' }), el('span', { class: 'tool-label', text: 'More' })]),
  ]);
  container.append(sheet, toolbar);
  bus.on('purchase', () => { if (isOpen) renderAll(); });
}

function toggleManage() {
  if (isOpen) { closeSheet(); return; }
  renderAll();
  isOpen = true;
  sheet.classList.remove('hidden');
  requestAnimationFrame(() => sheet.classList.add('show'));
  toolbar.firstChild.classList.add('active');
}
function closeSheet() {
  isOpen = false;
  sheet.classList.remove('show');
  setTimeout(() => sheet.classList.add('hidden'), 260);
  toolbar.firstChild.classList.remove('active');
}
export function openManage() { if (!isOpen) toggleManage(); }

function section(title) { return el('div', { class: 'sheet-section', text: title }); }

function renderAll() {
  liveUpdaters = [];
  const scrollTop = sheetBody.scrollTop;
  clear(sheetBody);
  sheetBody.appendChild(section('⬆️  Upgrades'));      renderUpgrades(sheetBody);
  sheetBody.appendChild(section('🧑‍💻  Staff'));         renderStaff(sheetBody);
  sheetBody.appendChild(section('🏢  Floor & Office')); renderOffice(sheetBody);
  sheetBody.appendChild(section('🪴  Decorations'));    renderDecor(sheetBody);
  sheetBody.appendChild(section('🏅  Achievements'));   renderAchievements(sheetBody);
  sheetBody.scrollTop = scrollTop;
}
export function refresh() { for (const fn of liveUpdaters) fn(); }

// ---- primitives -----------------------------------------------------------
function card({ accent = '#6cc6ff', icon, title, sub, desc, tags = [] }) {
  const node = el('div', { class: 'card' }, [
    el('div', { class: 'card-ico', text: icon, style: { background: accent + '22', color: accent } }),
    el('div', { class: 'card-main' }, [
      el('div', { class: 'card-row' }, [el('div', { class: 'card-title', text: title }), ...(sub ? [el('div', { class: 'card-sub', text: sub })] : [])]),
      ...(desc ? [el('div', { class: 'card-desc', text: desc })] : []),
      ...(tags.length ? [el('div', { class: 'card-tags' }, tags)] : []),
    ]),
    el('div', { class: 'card-actions' }),
  ]);
  return { node, actions: node.querySelector('.card-actions') };
}
function buyButton(label, getCost, onBuy, { canBuy } = {}) {
  const btn = el('button', { class: 'btn btn-buy' });
  const update = () => {
    const cost = getCost();
    const locked = canBuy ? !canBuy() : false;
    btn.disabled = locked || !(state.money >= cost && cost !== Infinity);
    btn.innerHTML = cost === Infinity ? `<b>${label}</b><span>MAX</span>` : `<b>${label}</b><span>${money(cost)}</span>`;
  };
  btn.addEventListener('click', () => { const r = onBuy(); if (r && !r.ok) toast(r.reason, { icon: '🚫', color: '#ff7a7a', ms: 2200 }); else renderAll(); });
  liveUpdaters.push(update); update();
  return btn;
}
function tag(text, color) { return el('span', { class: 'tag', text, style: { background: color + '22', color } }); }

// ---- STAFF ----------------------------------------------------------------
function renderStaff(body) {
  const m = computeModifiers();
  body.appendChild(el('div', { class: 'sheet-hint', html: `Your computer employees keep the zoo running — they <b>multiply all brainrot income</b>. Current multiplier: <b>×${m.empMult.toFixed(2)}</b>.` }));
  if (atCapacity()) body.appendChild(el('div', { class: 'sheet-warn', text: `Office full (${totalWorkers()}/${capacity()}). Expand your office to hire more.` }));
  for (const d of DEPARTMENTS) {
    const sd = state.depts[d.id];
    if (companyLevel() < d.unlockLevel) {
      const lc = card({ accent: '#9aa6c0', icon: '🔒', title: d.name, sub: d.role, desc: `Unlocks at company Level ${d.unlockLevel}.`, tags: [tag(`🔒 Lv ${d.unlockLevel}`, '#9aa6c0')] });
      lc.node.classList.add('locked-card');
      body.appendChild(lc.node);
      continue;
    }
    const tier = DESK_TIERS[sd.tier];
    const nextTier = DESK_TIERS[sd.tier + 1];
    const tags = [tag(`${sd.workers} staff`, d.uiColor), tag(`+${deptPower(d.id).toFixed(1)} power`, '#9aa6c0'), tag(tier.name, '#9aa6c0')];
    const c = card({ accent: d.uiColor, icon: d.icon, title: d.name, sub: d.role, desc: d.desc, tags });
    c.actions.appendChild(buyButton('Hire', () => hireCost(d.id), () => actions.hire(d.id), { canBuy: () => !atCapacity() }));
    c.actions.appendChild(buyButton(nextTier ? `⬆ ${nextTier.name.replace(' Station', '').replace(' Office', '').replace(' Setup', '')}` : 'Desk',
      () => deskUpgradeCost(d.id), () => actions.upgradeDesk(d.id), { canBuy: () => sd.workers > 0 && sd.tier < DESK_TIERS.length - 1 }));
    body.appendChild(c.node);
  }
}

// ---- UPGRADES -------------------------------------------------------------
function renderUpgrades(body) {
  body.appendChild(el('div', { class: 'sheet-hint', html: `Permanent boosts bought with coins. More unlock as your company <b>levels up</b> (Lv ${companyLevel()}).` }));
  for (const u of UPGRADES) {
    const lvl = state.upgrades[u.id] || 0;
    if (companyLevel() < u.unlockLevel) {
      const lc = card({ accent: '#9aa6c0', icon: '🔒', title: u.name, desc: `Unlocks at company Level ${u.unlockLevel}.`, tags: [tag(`🔒 Lv ${u.unlockLevel}`, '#9aa6c0')] });
      lc.node.classList.add('locked-card'); body.appendChild(lc.node); continue;
    }
    const tags = [tag(`Lv ${lvl}/${u.max}`, '#56cfe1')];
    const c = card({ accent: '#56cfe1', icon: u.icon, title: u.name, desc: u.desc, tags });
    c.actions.appendChild(buyButton(lvl > 0 ? 'Upgrade' : 'Buy', () => upgradeCost(u.id), () => actions.buyUpgrade(u.id), { canBuy: () => lvl < u.max }));
    body.appendChild(c.node);
  }
}

// ---- ACHIEVEMENTS ---------------------------------------------------------
function renderAchievements(body) {
  body.appendChild(el('div', { class: 'sheet-hint', html: `Achievements unlocked: <b>${unlockedCount()}/${ACHIEVEMENTS.length}</b>. Each pays out tokens or coins.` }));
  for (const a of ACHIEVEMENTS) {
    const done = isUnlocked(a);
    const prog = achievementProgress(a);
    const reward = []; if (a.reward.tokens) reward.push(`${a.reward.tokens}🎟️`); if (a.reward.coins) reward.push(money(a.reward.coins));
    const tags = [tag(reward.join(' '), '#ffce47')];
    if (!done) tags.unshift(tag(`${fmt(prog)}/${fmt(a.target)}`, '#9aa6c0'));
    const c = card({ accent: done ? '#22b573' : '#9aa6c0', icon: done ? '✅' : a.icon, title: a.name, desc: a.desc, tags });
    if (done) c.actions.appendChild(el('div', { class: 'pill-ok', text: '✓' }));
    c.node.classList.toggle('locked-card', !done);
    body.appendChild(c.node);
  }
}

// ---- DECOR ----------------------------------------------------------------
function renderDecor(body) {
  let morale = 0; for (const d of DECORATIONS) morale += state.decorations[d.id] * d.morale;
  body.appendChild(el('div', { class: 'sheet-hint', html: `Decorations raise morale, boosting all income. Current bonus: <b>+${Math.round(morale * 100)}%</b>.` }));
  for (const d of DECORATIONS) {
    const owned = state.decorations[d.id];
    const tags = [tag(`+${Math.round(d.morale * 100)}% income`, '#49e07d')];
    if (owned > 0) tags.push(tag(`owned ×${owned}`, '#9aa6c0'));
    const c = card({ accent: '#b18cff', icon: d.icon, title: d.name, desc: d.desc, tags });
    c.actions.appendChild(buyButton('Buy', () => decoCost(d.id), () => actions.buyDecoration(d.id)));
    body.appendChild(c.node);
  }
}

// ---- OFFICE ---------------------------------------------------------------
function renderOffice(body) {
  const cur = OFFICE_LEVELS[state.officeLevel];
  const next = OFFICE_LEVELS[state.officeLevel + 1];
  body.appendChild(el('div', { class: 'sheet-hint', html: `Your HQ: <b>${cur.name}</b> — ${totalWorkers()}/${cur.capacity} staff. Expanding unlocks more desks.` }));
  if (next) {
    const c = card({ accent: '#6c8cff', icon: '🏢', title: `Expand to ${next.name}`, desc: `Capacity ${cur.capacity} → ${next.capacity} staff · larger floor.`, tags: [tag(`+${next.capacity - cur.capacity} desks`, '#49e07d')] });
    c.actions.appendChild(buyButton('Expand', () => officeUpgradeCost(), () => actions.expandOffice()));
    body.appendChild(c.node);
  } else body.appendChild(el('div', { class: 'sheet-warn', text: '🏆 Largest AI campus on Earth. Maxed out.' }));
  body.appendChild(el('div', { class: 'stat-grid' }, [
    miniStat('Income', money(incomePerSec()) + '/s'),
    miniStat('Brainrots', `${collectionCount()}`),
    miniStat('Lifetime coins', money(state.lifetimeMoney)),
    miniStat('Viral moments', fmt(state.totalViral)),
  ]));
}
function miniStat(label, value) {
  return el('div', { class: 'mini-stat' }, [el('div', { class: 'mini-val', text: value }), el('div', { class: 'mini-label', text: label })]);
}

// ---- SETTINGS -------------------------------------------------------------
function openSettings() {
  const info = el('textarea', { class: 'save-box', readonly: 'true', rows: '3' });
  modal({
    title: '⚙️ Settings',
    bodyNodes: [
      el('p', { class: 'modal-text', html: 'Brainrot Zoo autosaves locally in this browser.' }),
      el('div', { class: 'modal-text', text: 'Export save code:' }), info,
    ],
    actions: [
      { label: 'Show Save Code', keepOpen: true, onClick: () => { info.value = exportSave(); info.select(); } },
      { label: 'Import…', keepOpen: true, onClick: () => importFlow() },
      { label: 'Reset Game', onClick: () => confirmReset() },
      { label: 'Close', primary: true },
    ],
  });
}
function importFlow() {
  const ta = el('textarea', { class: 'save-box', rows: '3', placeholder: 'Paste save code…' });
  modal({ title: 'Import Save', bodyNodes: [el('p', { class: 'modal-text', text: 'Paste a save code to overwrite your game:' }), ta], actions: [
    { label: 'Import', primary: true, onClick: () => { try { importSave(ta.value); toast('Save imported! Reloading…'); setTimeout(() => location.reload(), 700); } catch { toast('Invalid save code.', { icon: '🚫', color: '#ff7a7a' }); } } },
    { label: 'Cancel' },
  ] });
}
function confirmReset() {
  modal({ title: 'Reset everything?', bodyNodes: [el('p', { class: 'modal-text', text: 'Wipes your whole zoo. No undo.' })], actions: [
    { label: 'Delete my zoo', onClick: () => { resetState(); toast('Fresh start!'); setTimeout(() => location.reload(), 500); } },
    { label: 'Keep playing', primary: true },
  ] });
}

window.addEventListener('beforeunload', () => saveState());
