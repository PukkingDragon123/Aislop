// ============================================================================
//  The SHOP — one Cookie-Clicker-style list. Staff, stations, decorations,
//  upgrades, desk upgrades and office expansions are all just "things you buy",
//  sorted CHEAPEST → priciest so there's always an obvious next purchase.
//  Locked items sit dimmed at the bottom so you can see what's coming.
//  (Goals/achievements + settings live behind their own toolbar buttons.)
// ============================================================================

import { el, clear } from './dom.js';
import {
  state, hireCost, deskUpgradeCost, decoCost, officeUpgradeCost, upgradeCost, stationCost,
  capacity, totalWorkers, atCapacity, saveState, resetState, exportSave, importSave,
} from '../core/state.js';
import { DEPARTMENTS, DECORATIONS, DESK_TIERS, OFFICE_LEVELS, UPGRADES, STATIONS, ACHIEVEMENTS } from '../core/config.js';
import { fmt, money } from '../core/format.js';
import * as actions from '../sim/actions.js';
import { incomePerSec, companyLevel, isAutomated } from '../sim/economy.js';
import { achievementProgress, isUnlocked, unlockedCount } from '../sim/achievements.js';
import { bus } from '../core/events.js';
import { toast, modal } from './toast.js';

let sheet, sheetTitle, sheetSub, sheetBody, toolbar;
let isOpen = false;
let liveUpdaters = [];

export function initPanels(container) {
  sheetTitle = el('div', { class: 'sheet-title', text: '🛒 Build' });
  sheetSub = el('div', { class: 'shop-sub' });
  sheetBody = el('div', { class: 'sheet-body' });
  sheet = el('div', { class: 'sheet manage hidden' }, [
    el('div', { class: 'sheet-head' }, [el('div', { class: 'sheet-headmain' }, [sheetTitle, sheetSub]), el('button', { class: 'sheet-close', text: '✕', onclick: closeSheet })]),
    sheetBody,
  ]);
  toolbar = el('div', { class: 'toolbar' }, [
    el('button', { class: 'tool-btn big', onclick: toggleManage }, [el('span', { class: 'tool-ico', text: '🛒' }), el('span', { class: 'tool-label', text: 'Build' })]),
    el('button', { class: 'tool-btn', onclick: openGoals }, [el('span', { class: 'tool-ico', text: '🏅' }), el('span', { class: 'tool-label', text: 'Goals' })]),
    el('button', { class: 'tool-btn', onclick: openSettings }, [el('span', { class: 'tool-ico', text: '⚙️' }), el('span', { class: 'tool-label', text: 'More' })]),
  ]);
  container.append(sheet, toolbar);
  bus.on('purchase', () => { if (isOpen) renderStore(); });
}

function toggleManage() {
  if (isOpen) { closeSheet(); return; }
  renderStore();
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
export function refresh() { if (isOpen) updateSub(); for (const fn of liveUpdaters) fn(); }

// ---- the unified buyable list ---------------------------------------------
function buildables() {
  const out = [];
  // Staff — hire (repeatable, multiplies income).
  for (const d of DEPARTMENTS) out.push({
    key: 'hire-' + d.id, kind: 'staff', icon: d.icon, name: d.name, sub: d.role,
    desc: 'Hire ' + d.role + ' — multiplies all brainrot income.', accent: d.uiColor, unlockLevel: d.unlockLevel,
    ownedLabel: () => `${state.depts[d.id].workers} staff`, note: () => (atCapacity() ? 'office full' : null),
    cost: () => hireCost(d.id), label: 'Hire', buy: () => actions.hire(d.id), canBuy: () => !atCapacity(),
  });
  // Desk upgrades — only surface when you have staff and room to grow.
  for (const d of DEPARTMENTS) out.push({
    key: 'desk-' + d.id, kind: 'desk', icon: '🪑', name: d.name + ' Desks', sub: 'workstation',
    desc: () => `Upgrade to ${DESK_TIERS[Math.min(state.depts[d.id].tier + 1, DESK_TIERS.length - 1)].name} — more income per worker.`,
    accent: d.uiColor, unlockLevel: d.unlockLevel,
    hide: () => state.depts[d.id].workers <= 0 || state.depts[d.id].tier >= DESK_TIERS.length - 1,
    ownedLabel: () => DESK_TIERS[state.depts[d.id].tier].name,
    cost: () => deskUpgradeCost(d.id), label: 'Upgrade', buy: () => actions.upgradeDesk(d.id),
  });
  // Stations — build machines; tap them in the office to run (or automate).
  for (const s of STATIONS) out.push({
    key: 'stn-' + s.id, kind: 'station', icon: s.icon, name: s.name, sub: 'station',
    desc: s.desc + (isAutomated() ? ' (running on Auto-Pilot)' : ' Tap it in the zoo to run!'),
    accent: s.uiColor, unlockLevel: s.unlockLevel, ownedLabel: () => `×${state.stations[s.id] || 0}`,
    cost: () => stationCost(s.id), label: 'Build', buy: () => actions.buyStation(s.id),
  });
  // Decorations — morale / effects.
  for (const d of DECORATIONS) out.push({
    key: 'deco-' + d.id, kind: 'deco', icon: d.icon, name: d.name, sub: 'decor',
    desc: d.desc, accent: '#b18cff', unlockLevel: 0, ownedLabel: () => (state.decorations[d.id] ? `×${state.decorations[d.id]}` : null),
    cost: () => decoCost(d.id), label: 'Buy', buy: () => actions.buyDecoration(d.id),
  });
  // Upgrades — permanent boosts (drop out of the list once maxed).
  for (const u of UPGRADES) out.push({
    key: 'up-' + u.id, kind: 'upgrade', icon: u.icon, name: u.name, sub: 'upgrade',
    desc: u.desc, accent: '#56cfe1', unlockLevel: u.unlockLevel,
    hide: () => (state.upgrades[u.id] || 0) >= u.max, ownedLabel: () => `Lv ${state.upgrades[u.id] || 0}/${u.max}`,
    cost: () => upgradeCost(u.id), label: () => ((state.upgrades[u.id] || 0) > 0 ? 'Upgrade' : 'Buy'), buy: () => actions.buyUpgrade(u.id),
  });
  // Office expansion — capacity for more staff.
  out.push({
    key: 'office', kind: 'office', icon: '🏢', name: 'Expand Office', sub: 'capacity',
    desc: () => { const n = OFFICE_LEVELS[state.officeLevel + 1]; return n ? `Bigger floor → ${n.name} (${n.capacity} staff).` : 'Largest campus on Earth.'; },
    accent: '#6c8cff', unlockLevel: 0, hide: () => state.officeLevel >= OFFICE_LEVELS.length - 1,
    ownedLabel: () => `${totalWorkers()}/${capacity()}`, cost: () => officeUpgradeCost(), label: 'Expand', buy: () => actions.expandOffice(),
  });
  return out.filter((b) => !(b.hide && b.hide()));
}

function val(x) { return typeof x === 'function' ? x() : x; }
function costNum(b) { const c = b.cost(); return c === Infinity ? Number.MAX_VALUE : c; }

function renderStore() {
  liveUpdaters = [];
  const scrollTop = sheetBody.scrollTop;
  clear(sheetBody);
  sheetBody.appendChild(el('div', { class: 'sheet-hint', html: '👆 <b>Tap the office</b> to earn 🪙. Buy anything below — it\'s sorted <b>cheapest first</b>. New stuff unlocks as your company <b>levels up</b>.' }));

  const L = companyLevel();
  const all = buildables();
  const ready = all.filter((b) => L >= b.unlockLevel).sort((a, b) => costNum(a) - costNum(b));
  const locked = all.filter((b) => L < b.unlockLevel).sort((a, b) => (a.unlockLevel - b.unlockLevel) || (costNum(a) - costNum(b)));

  for (const b of ready) sheetBody.appendChild(storeRow(b));
  if (locked.length) {
    sheetBody.appendChild(el('div', { class: 'shop-divider', html: `🔒 <span>Unlocks as you level up</span>` }));
    for (const b of locked) sheetBody.appendChild(lockedRow(b));
  }
  sheetBody.scrollTop = scrollTop;
  updateSub();
}

function storeRow(b) {
  const tags = [];
  const owned = b.ownedLabel && val(b.ownedLabel); if (owned) tags.push(tag(owned, b.accent));
  const note = b.note && b.note(); if (note) tags.push(tag(note, '#e58b2b'));
  const c = card({ accent: b.accent, icon: b.icon, title: b.name, sub: val(b.sub), desc: val(b.desc), tags });
  c.actions.appendChild(buyButton(val(b.label), b.cost, b.buy, { canBuy: b.canBuy }));
  return c.node;
}
function lockedRow(b) {
  const c = card({ accent: '#9aa6c0', icon: '🔒', title: b.name, sub: val(b.sub), desc: `Unlocks at company Level ${b.unlockLevel}.`, tags: [tag(`🔒 Lv ${b.unlockLevel}`, '#9aa6c0')] });
  c.node.classList.add('locked-card');
  return c.node;
}

function updateSub() {
  if (!sheetSub) return;
  sheetSub.innerHTML = `Lv <b>${companyLevel()}</b> · <b>${money(incomePerSec())}</b>/s · ${fmt(totalWorkers())} staff`;
}

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
  btn.addEventListener('click', () => { const r = onBuy(); if (r && !r.ok) toast(r.reason, { icon: '🚫', color: '#ff7a7a', ms: 2200 }); else renderStore(); });
  liveUpdaters.push(update); update();
  return btn;
}
function tag(text, color) { return el('span', { class: 'tag', text, style: { background: color + '22', color } }); }

// ---- GOALS (achievements) -------------------------------------------------
function openGoals() {
  const rows = ACHIEVEMENTS.map((a) => {
    const done = isUnlocked(a);
    const prog = achievementProgress(a);
    const reward = []; if (a.reward.tokens) reward.push(`${a.reward.tokens}🎟️`); if (a.reward.coins) reward.push(money(a.reward.coins));
    return el('div', { class: `quest-li ${done ? 'done' : ''}` }, [
      el('div', { class: 'quest-li-ico', text: done ? '✅' : a.icon }),
      el('div', { class: 'quest-li-main' }, [
        el('div', { class: 'quest-li-title', text: a.name }),
        el('div', { class: 'quest-li-desc', text: `${a.desc} · ${reward.join(' ')}${done ? '' : `  ·  ${fmt(prog)}/${fmt(a.target)}`}` }),
      ]),
      el('div', { class: 'quest-li-status', text: done ? '✓' : '🔒' }),
    ]);
  });
  modal({
    title: `🏅 Goals · ${unlockedCount()}/${ACHIEVEMENTS.length}`,
    bodyNodes: [el('div', { class: 'quest-list' }, rows)],
    actions: [{ label: 'Close', primary: true }],
  });
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
      { label: 'Load / Import…', keepOpen: true, onClick: () => importFlow() },
      { label: 'Reset Game', onClick: () => confirmReset() },
      { label: 'Close', primary: true },
    ],
  });
}
function importFlow() {
  const ta = el('textarea', { class: 'save-box', rows: '3', placeholder: 'Paste save code…' });
  modal({ title: '📥 Load Save', bodyNodes: [el('p', { class: 'modal-text', text: 'Paste a save code to load that game (replaces your current zoo):' }), ta], actions: [
    { label: 'Load Save', primary: true, onClick: () => { try { importSave(ta.value); toast('Save loaded! Reloading…'); setTimeout(() => location.reload(), 700); } catch { toast('Invalid save code.', { icon: '🚫', color: '#ff7a7a' }); } } },
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
