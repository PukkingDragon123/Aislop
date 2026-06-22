// ============================================================================
//  Gacha screen — GENERATE BRAINROT. Pull buttons (×1 / ×10), a juicy rarity
//  reveal (cards pop in with rarity glow, rays, confetti + screen shake), and
//  the full collection grid below. The heart of the "collect" pillar.
// ============================================================================

import { el, clear } from './dom.js';
import { fmt, money } from '../core/format.js';
import { state } from '../core/state.js';
import { ROSTER, RARITIES } from '../core/config.js';
import { pull, pullCost, canAffordPull, ownedCount, RARITY_RANK } from '../sim/gacha.js';
import { charArt } from '../sim/brainrot.js';
import { screenShake } from '../world/effects.js';
import { toast } from './toast.js';

let panel, body, open = false, fab;

export function initGacha(container) {
  fab = el('button', { class: 'feed-fab act-gacha', onclick: openGacha }, [el('span', { text: '🎰' })]);
  body = el('div', { class: 'gacha-body' });
  panel = el('div', { class: 'store hidden' }, [
    el('div', { class: 'store-card gacha-card' }, [
      el('div', { class: 'store-head' }, [
        el('div', { class: 'store-title', html: '🎰 <b>Generate Brainrot</b>' }),
        el('div', { class: 'store-gems gacha-bal' }),
        el('button', { class: 'store-close', text: '✕', onclick: closeGacha }),
      ]),
      body,
    ]),
  ]);
  panel.addEventListener('click', (e) => { if (e.target === panel) closeGacha(); });
  container.append(fab, panel);
}

export function openGacha() { render(); open = true; panel.classList.remove('hidden'); requestAnimationFrame(() => panel.classList.add('show')); }
export function closeGacha() { open = false; panel.classList.remove('show'); setTimeout(() => panel.classList.add('hidden'), 240); }
export function isGachaOpen() { return open; }

export function refreshGacha() {
  if (!open) return;
  const bal = panel.querySelector('.gacha-bal');
  if (bal) bal.innerHTML = `${fmt(state.tokens)} 🎟️ · ${money(state.money)}`;
  for (const fn of liveBtns) fn();
  if (fab) fab.classList.toggle('ready', canAffordPull(false));
}

let liveBtns = [];
function pullButton(label, multi) {
  const btn = el('button', { class: `gacha-btn ${multi ? 'multi' : ''}` });
  const upd = () => {
    const c = pullCost(multi);
    btn.disabled = !(state.money >= c.coins && state.tokens >= c.tokens);
    btn.innerHTML = `<b>${label}</b><span>${c.tokens} 🎟️ · ${money(c.coins)}</span>`;
  };
  btn.addEventListener('click', () => {
    const res = pull(multi);
    if (!res.ok) { toast(res.reason, { icon: '🚫', color: '#ff7a7a' }); return; }
    showReveal(res.results, multi);
    render();
  });
  liveBtns.push(upd); upd();
  return btn;
}

function render() {
  liveBtns = [];
  clear(body);
  const bal = panel.querySelector('.gacha-bal');
  if (bal) bal.innerHTML = `${fmt(state.tokens)} 🎟️ · ${money(state.money)}`;

  body.appendChild(el('div', { class: 'gacha-hint', html: 'Spend 🎟️ + 🪙 to generate a brainrot. <b>Duplicates fuse</b> — they level up and earn more. Earn 🎟️ from <b>quests</b>.' }));
  body.appendChild(el('div', { class: 'gacha-buttons' }, [
    pullButton('Generate ×1', false),
    pullButton('Generate ×10', true),
  ]));

  body.appendChild(el('div', { class: 'gacha-collhead', html: `🦓 Your Zoo · <b>${ownedCount()}/${ROSTER.length}</b>` }));
  const grid = el('div', { class: 'collection-grid' });
  for (const ch of ROSTER) {
    const lvl = state.collection[ch.id] || 0;
    const owned = lvl > 0;
    const r = RARITIES[ch.rarity];
    const tile = el('div', { class: `coll ${owned ? 'owned' : 'locked'}`, style: { borderColor: owned ? r.color : 'transparent', boxShadow: owned ? `0 0 12px ${r.color}44` : 'none' } });
    const art = el('div', { class: 'coll-art' });
    if (owned) art.appendChild(charArt(ch, 96)); else art.appendChild(el('div', { class: 'coll-lock', text: '❔' }));
    tile.append(
      art,
      el('div', { class: 'coll-name', text: owned ? ch.name : '???' }),
      el('div', { class: 'coll-rar', style: { color: r.color }, text: owned ? `${r.name} · Lv ${lvl}` : '—' }),
      owned ? el('div', { class: 'coll-inc', text: `${money(r.income * lvl)}/s` }) : null,
    );
    grid.appendChild(tile);
  }
  body.appendChild(grid);
}

// ---- the summon reveal ----------------------------------------------------
function showReveal(results, multi) {
  const best = results.reduce((b, r) => Math.max(b, RARITY_RANK[r.char.rarity]), 0);
  const cards = el('div', { class: 'reveal-cards' });
  const footer = el('div', { class: 'reveal-foot hidden' }, [
    el('button', { class: 'gacha-btn', text: 'Again', onclick: () => { ov.remove(); const r = pull(multi); if (!r.ok) { toast(r.reason, { icon: '🚫', color: '#ff7a7a' }); render(); } else { showReveal(r.results, multi); render(); } } }),
    el('button', { class: 'gacha-btn primary', text: 'Collect', onclick: () => { ov.classList.remove('show'); setTimeout(() => ov.remove(), 250); } }),
  ]);
  const orb = el('div', { class: 'summon-orb' }, [el('div', { class: 'summon-core', text: '🎰' })]);
  const ov = el('div', { class: 'reveal' }, [el('div', { class: 'reveal-inner' }, [orb, cards, footer])]);
  document.body.appendChild(ov);
  requestAnimationFrame(() => { ov.classList.add('show'); orb.classList.add('charge'); });
  screenShake(0.4);

  const stagger = results.length > 3 ? 130 : 360;
  setTimeout(() => {
    orb.classList.add('burst');
    screenShake(0.9 + best * 0.3);
    flashOverlay(best);
    setTimeout(() => orb.remove(), 320);
    results.forEach((res, i) => setTimeout(() => revealCard(cards, res), i * stagger));
    setTimeout(() => footer.classList.remove('hidden'), results.length * stagger + 250);
  }, 760);
}

function revealCard(cards, res) {
  const r = RARITIES[res.char.rarity];
  const card = el('div', { class: `reveal-card r-${res.char.rarity}` });
  const art = el('div', { class: 'reveal-art' }); art.appendChild(charArt(res.char, 200));
  card.append(
    art,
    el('div', { class: 'reveal-name', text: res.char.name }),
    el('div', { class: 'reveal-rar', style: { color: r.color }, text: r.name }),
    el('div', { class: `reveal-badge ${res.isNew ? 'new' : 'up'}`, text: res.isNew ? '✦ NEW' : `Lv ${res.level - 1} → ${res.level}` }),
  );
  cards.appendChild(card);
  requestAnimationFrame(() => card.classList.add('in'));
  if (RARITY_RANK[res.char.rarity] >= 2) screenShake(0.5 + RARITY_RANK[res.char.rarity] * 0.22);
}

function flashOverlay(best) {
  if (best < 3) return;
  const colors = { 3: '#ffb02e', 4: '#ff4d8d', 5: '#ffcf33', 6: '#7be0ff' };
  const f = el('div', { class: 'reveal-flash' });
  f.style.background = colors[best] || '#ffffff';
  document.body.appendChild(f);
  requestAnimationFrame(() => f.classList.add('go'));
  setTimeout(() => f.remove(), 600);
}
