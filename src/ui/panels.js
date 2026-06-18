// ============================================================================
//  Bottom toolbar + shop sheets: Staff, Decorate, Products, Upgrades, Office.
//  Cards are rebuilt when a tab opens / on purchase; a lightweight refresh loop
//  only toggles affordability + live numbers so the UI stays smooth.
// ============================================================================

import { el, clear } from './dom.js';
import {
  state, hireCost, deskUpgradeCost, decoCost, upgradeCost, officeUpgradeCost,
  capacity, totalWorkers, atCapacity,
} from '../core/state.js';
import { DEPARTMENTS, DECORATIONS, PRODUCTS, UPGRADES, DESK_TIERS, OFFICE_LEVELS } from '../core/config.js';
import { fmt, money } from '../core/format.js';
import * as actions from '../sim/actions.js';
import { stageCapacity, getBottleneck, computeModifiers } from '../sim/economy.js';
import { bus } from '../core/events.js';
import { toast, modal } from './toast.js';
import { saveState, resetState, exportSave, importSave } from '../core/state.js';

let sheet, sheetTitle, sheetBody, toolbar;
let currentTab = null;
let liveUpdaters = [];

const TABS = [
  { id: 'staff', icon: '🧑‍💻', label: 'Staff', render: renderStaff },
  { id: 'decor', icon: '🪴', label: 'Decor', render: renderDecor },
  { id: 'products', icon: '🚀', label: 'Products', render: renderProducts },
  { id: 'upgrades', icon: '⚡', label: 'Upgrades', render: renderUpgrades },
  { id: 'office', icon: '🏢', label: 'Office', render: renderOffice },
];

export function initPanels(container) {
  sheetTitle = el('div', { class: 'sheet-title' });
  sheetBody = el('div', { class: 'sheet-body' });
  sheet = el('div', { class: 'sheet hidden' }, [
    el('div', { class: 'sheet-head' }, [
      sheetTitle,
      el('button', { class: 'sheet-close', text: '✕', onclick: closeSheet }),
    ]),
    sheetBody,
  ]);

  toolbar = el('div', { class: 'toolbar' },
    TABS.map((t) => el('button', { class: 'tool-btn', 'data-tab': t.id, onclick: () => toggleTab(t.id) }, [
      el('span', { class: 'tool-ico', text: t.icon }),
      el('span', { class: 'tool-label', text: t.label }),
    ])).concat(
      el('button', { class: 'tool-btn', onclick: openSettings }, [
        el('span', { class: 'tool-ico', text: '⚙️' }),
        el('span', { class: 'tool-label', text: 'More' }),
      ]),
    ));

  container.append(sheet, toolbar);
  bus.on('purchase', () => { if (currentTab) renderTab(currentTab); });
}

function toggleTab(id) {
  if (currentTab === id && !sheet.classList.contains('hidden')) { closeSheet(); return; }
  renderTab(id);
  sheet.classList.remove('hidden');
  requestAnimationFrame(() => sheet.classList.add('show'));
  for (const b of toolbar.querySelectorAll('.tool-btn')) b.classList.toggle('active', b.dataset.tab === id);
}

function closeSheet() {
  sheet.classList.remove('show');
  setTimeout(() => sheet.classList.add('hidden'), 260);
  currentTab = null;
  for (const b of toolbar.querySelectorAll('.tool-btn')) b.classList.remove('active');
}

function renderTab(id) {
  currentTab = id;
  liveUpdaters = [];
  const tab = TABS.find((t) => t.id === id);
  sheetTitle.textContent = tab.label;
  clear(sheetBody);
  tab.render(sheetBody);
}

// Called ~4x/sec from the main loop: refresh live affordability/numbers only.
export function refresh() {
  for (const fn of liveUpdaters) fn();
}

// ---------------------------------------------------------------------------
//  Card primitive
// ---------------------------------------------------------------------------
function card({ accent = '#6cc6ff', icon, title, sub, desc, tags = [] }) {
  const node = el('div', { class: 'card' }, [
    el('div', { class: 'card-ico', text: icon, style: { background: accent + '22', color: accent } }),
    el('div', { class: 'card-main' }, [
      el('div', { class: 'card-row' }, [
        el('div', { class: 'card-title', text: title }),
        ...(sub ? [el('div', { class: 'card-sub', text: sub })] : []),
      ]),
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
    const afford = state.money >= cost && cost !== Infinity;
    btn.disabled = locked || !afford;
    btn.innerHTML = cost === Infinity
      ? `<b>${label}</b><span>MAX</span>`
      : `<b>${label}</b><span>${money(cost)}</span>`;
  };
  btn.addEventListener('click', () => {
    const res = onBuy();
    if (res && !res.ok) toast(res.reason, { icon: '🚫', color: '#ff7a7a', ms: 2200 });
    else renderTab(currentTab);
  });
  liveUpdaters.push(update);
  update();
  return btn;
}

function tag(text, color) {
  return el('span', { class: 'tag', text, style: { background: color + '22', color } });
}

// ---------------------------------------------------------------------------
//  STAFF
// ---------------------------------------------------------------------------
function renderStaff(body) {
  const m = computeModifiers();
  const bottleneck = getBottleneck();
  body.appendChild(el('div', { class: 'sheet-hint', html:
    `Balance staff across all five stages — the <b>slowest stage throttles the whole pipeline</b>. Buffers fill up behind a bottleneck.` }));

  if (atCapacity()) {
    body.appendChild(el('div', { class: 'sheet-warn', text: `Office full (${totalWorkers()}/${capacity()}). Expand your office to hire more.` }));
  }

  for (let i = 0; i < DEPARTMENTS.length; i++) {
    const d = DEPARTMENTS[i];
    const sd = state.depts[d.id];
    const uiColor = d.uiColor;
    const cap = stageCapacity(d.id, m);
    const tier = DESK_TIERS[sd.tier];
    const tags = [tag(`${sd.workers} staff`, uiColor), tag(`${cap.toFixed(1)}/s`, '#9aa6c0')];
    if (d.id === bottleneck && totalWorkers() > 0) tags.push(tag('⚠ bottleneck', '#ff9f45'));
    tags.push(tag(tier.name, '#9aa6c0'));

    const c = card({ accent: uiColor, icon: d.icon, title: d.name, sub: d.role, desc: d.desc, tags });
    c.actions.appendChild(buyButton('Hire', () => hireCost(d.id), () => actions.hire(d.id),
      { canBuy: () => !atCapacity() }));
    const nextTier = DESK_TIERS[sd.tier + 1];
    c.actions.appendChild(buyButton(nextTier ? `⬆ ${shortName(nextTier.name)}` : 'Desk', () => deskUpgradeCost(d.id),
      () => actions.upgradeDesk(d.id), { canBuy: () => sd.workers > 0 && sd.tier < DESK_TIERS.length - 1 }));
    body.appendChild(c.node);
  }
}

function shortName(n) { return n.replace(' Station', '').replace(' Office', '').replace(' Setup', ''); }

// ---------------------------------------------------------------------------
//  DECOR
// ---------------------------------------------------------------------------
function renderDecor(body) {
  let morale = 0;
  for (const d of DECORATIONS) morale += state.decorations[d.id] * d.morale;
  body.appendChild(el('div', { class: 'sheet-hint', html:
    `Decorations raise <b>morale</b>, boosting every department's output. Current morale bonus: <b>+${Math.round(morale * 100)}%</b>.` }));

  for (const d of DECORATIONS) {
    const owned = state.decorations[d.id];
    const tags = [tag(`+${Math.round(d.morale * 100)}% morale`, '#49e07d')];
    if (owned > 0) tags.push(tag(`owned ×${owned}`, '#9aa6c0'));
    const c = card({ accent: '#b18cff', icon: d.icon, title: d.name, desc: d.desc, tags });
    c.actions.appendChild(buyButton('Buy', () => decoCost(d.id), () => actions.buyDecoration(d.id)));
    body.appendChild(c.node);
  }
}

// ---------------------------------------------------------------------------
//  PRODUCTS
// ---------------------------------------------------------------------------
function renderProducts(body) {
  body.appendChild(el('div', { class: 'sheet-hint', html:
    `Launch new AI product lines to <b>multiply revenue & followers</b>. Each unlocks at a follower milestone.` }));

  for (const p of PRODUCTS) {
    const owned = state.products[p.id];
    const tags = [tag(`+${Math.round(p.revMult * 100)}% rev`, '#49e07d'), tag(`+${Math.round(p.folMult * 100)}% fans`, '#6cc6ff')];
    const c = card({ accent: '#ff9f45', icon: p.icon, title: p.name, desc: p.blurb, tags });
    if (owned) {
      c.actions.appendChild(el('div', { class: 'pill-ok', text: '✓ Launched' }));
    } else if (state.followers < p.followerReq) {
      c.actions.appendChild(el('div', { class: 'pill-lock', text: `🔒 ${fmt(p.followerReq)} fans` }));
    } else {
      c.actions.appendChild(buyButton('Launch', () => p.cost, () => actions.buyProduct(p.id)));
    }
    body.appendChild(c.node);
  }
}

// ---------------------------------------------------------------------------
//  UPGRADES
// ---------------------------------------------------------------------------
function renderUpgrades(body) {
  body.appendChild(el('div', { class: 'sheet-hint', html:
    `Company-wide upgrades. Stack them to keep the slop machine humming.` }));

  for (const u of UPGRADES) {
    const lvl = state.upgrades[u.id];
    const tags = [tag(`Lv ${lvl}/${u.max}`, '#6cc6ff')];
    const c = card({ accent: '#56cfe1', icon: u.icon, title: u.name, desc: u.desc, tags });
    c.actions.appendChild(buyButton(lvl > 0 ? 'Upgrade' : 'Buy', () => upgradeCost(u.id),
      () => actions.buyUpgrade(u.id), { canBuy: () => lvl < u.max }));
    body.appendChild(c.node);
  }
}

// ---------------------------------------------------------------------------
//  OFFICE
// ---------------------------------------------------------------------------
function renderOffice(body) {
  const cur = OFFICE_LEVELS[state.officeLevel];
  const next = OFFICE_LEVELS[state.officeLevel + 1];
  body.appendChild(el('div', { class: 'sheet-hint', html:
    `Your HQ: <b>${cur.name}</b> — ${totalWorkers()}/${cur.capacity} staff. Expanding unlocks more desks and a bigger, fancier office.` }));

  if (next) {
    const c = card({
      accent: '#6c8cff', icon: '🏢', title: `Expand to ${next.name}`,
      desc: `Capacity ${cur.capacity} → ${next.capacity} staff · larger floor.`,
      tags: [tag(`+${next.capacity - cur.capacity} desks`, '#49e07d')],
    });
    c.actions.appendChild(buyButton('Expand', () => officeUpgradeCost(), () => actions.expandOffice()));
    body.appendChild(c.node);
  } else {
    body.appendChild(el('div', { class: 'sheet-warn', text: '🏆 You run the largest AI campus on Earth. Maximum office reached.' }));
  }

  // Lifetime stats.
  body.appendChild(el('div', { class: 'stat-grid' }, [
    miniStat('Lifetime earnings', money(state.lifetimeMoney)),
    miniStat('Pieces published', fmt(state.lifetimePublished)),
    miniStat('Viral moments', fmt(state.totalViral)),
    miniStat('Total staff', fmt(totalWorkers())),
  ]));
}

function miniStat(label, value) {
  return el('div', { class: 'mini-stat' }, [
    el('div', { class: 'mini-val', text: value }),
    el('div', { class: 'mini-label', text: label }),
  ]);
}

// ---------------------------------------------------------------------------
//  SETTINGS modal
// ---------------------------------------------------------------------------
function openSettings() {
  const info = el('textarea', { class: 'save-box', readonly: 'true', rows: '3' });
  modal({
    title: '⚙️ Settings',
    bodyNodes: [
      el('p', { class: 'modal-text', html: 'AI Slop.co autosaves locally. Your empire is safe in this browser.' }),
      el('div', { class: 'modal-text', text: 'Export save code:' }),
      info,
      el('div', { class: 'modal-text', html: 'Made with Three.js · all art generated procedurally · <b>v1.0</b>' }),
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
  modal({
    title: 'Import Save',
    bodyNodes: [el('p', { class: 'modal-text', text: 'Paste a save code to overwrite your current game:' }), ta],
    actions: [
      { label: 'Import', primary: true, onClick: () => {
          try { importSave(ta.value); toast('Save imported! Reloading…'); setTimeout(() => location.reload(), 700); }
          catch { toast('Invalid save code.', { icon: '🚫', color: '#ff7a7a' }); }
        } },
      { label: 'Cancel' },
    ],
  });
}

function confirmReset() {
  modal({
    title: 'Reset everything?',
    bodyNodes: [el('p', { class: 'modal-text', text: 'This wipes your whole company. There is no undo.' })],
    actions: [
      { label: 'Delete my empire', onClick: () => { resetState(); toast('Fresh start!'); setTimeout(() => location.reload(), 500); } },
      { label: 'Keep playing', primary: true },
    ],
  });
}

// Persist on tab close.
window.addEventListener('beforeunload', () => saveState());
