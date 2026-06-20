// ============================================================================
//  Store — watch-ad rewards + a premium gem shop, with a (parody) full-screen
//  ad that plays before granting the reward. No real money; gems come from
//  quests, ads and milestones. Pure mobile-game theatre.
// ============================================================================

import { el, clear } from './dom.js';
import { fmt, money, duration } from '../core/format.js';
import { state } from '../core/state.js';
import { AD_REWARDS, GEM_SHOP, adAvailable, adRemaining, grantAd, buyGem } from '../sim/meta.js';
import { toast } from './toast.js';

let panel, body, open = false;
let liveFns = [];

export function initStore(container) {
  body = el('div', { class: 'store-body' });
  panel = el('div', { class: 'store hidden' }, [
    el('div', { class: 'store-card' }, [
      el('div', { class: 'store-head' }, [
        el('div', { class: 'store-title', html: '💎 <b>Store</b>' }),
        el('div', { class: 'store-gems', id: 'storeGems' }),
        el('button', { class: 'store-close', text: '✕', onclick: closeStore }),
      ]),
      body,
    ]),
  ]);
  panel.addEventListener('click', (e) => { if (e.target === panel) closeStore(); });
  container.appendChild(panel);
}

export function openStore() {
  render();
  open = true;
  panel.classList.remove('hidden');
  requestAnimationFrame(() => panel.classList.add('show'));
}
export function closeStore() {
  open = false;
  panel.classList.remove('show');
  setTimeout(() => panel.classList.add('hidden'), 240);
}
export function isStoreOpen() { return open; }

export function refreshStore() {
  if (!open) return;
  for (const fn of liveFns) fn();
  const g = document.getElementById('storeGems');
  if (g) g.innerHTML = `${fmt(state.gems)} <span>💎</span>`;
}

function render() {
  liveFns = [];
  clear(body);
  const g = panel.querySelector('#storeGems');
  if (g) g.innerHTML = `${fmt(state.gems)} <span>💎</span>`;

  body.appendChild(el('div', { class: 'store-section', text: '⚡ Free boosts · watch a short ad' }));
  for (const ad of AD_REWARDS) {
    const btn = el('button', { class: 'store-btn ad', onclick: () => playAd(ad) });
    const update = () => {
      const ready = adAvailable(ad.id);
      btn.disabled = !ready;
      btn.innerHTML = ready ? '<span>▶</span> Watch' : `⏳ ${duration(adRemaining(ad.id))}`;
    };
    liveFns.push(update); update();
    body.appendChild(storeRow(ad.icon, ad.title, ad.desc, btn, 'free'));
  }

  body.appendChild(el('div', { class: 'store-section', text: '💎 Gem store' }));
  for (const item of GEM_SHOP) {
    const btn = el('button', { class: 'store-btn gem', onclick: () => {
      const res = buyGem(item.id);
      if (!res.ok) toast(res.reason, { icon: '💎', color: '#ff7a7a', ms: 2200 });
      else { toast(`${item.title} activated!`, { icon: item.icon, color: '#19e3ff' }); render(); }
    } });
    const update = () => { btn.disabled = state.gems < item.cost; btn.innerHTML = `${item.cost} <span>💎</span>`; };
    liveFns.push(update); update();
    body.appendChild(storeRow(item.icon, item.title, item.desc, btn, 'gem'));
  }

  body.appendChild(el('div', { class: 'store-note', text: 'Gems come from quests, ads & milestones. It\'s a parody — no real money, ever. 💜' }));
}

function storeRow(icon, title, desc, btn, kind) {
  return el('div', { class: `store-row ${kind}` }, [
    el('div', { class: 'store-row-ico', text: icon }),
    el('div', { class: 'store-row-main' }, [
      el('div', { class: 'store-row-title', text: title }),
      el('div', { class: 'store-row-desc', text: desc }),
    ]),
    btn,
  ]);
}

// --------------------------------------------------------------------------
//  Parody full-screen ad
// --------------------------------------------------------------------------
const FAKE_ADS = [
  { app: 'Tung Tower 3D', emoji: '🪵', blurb: 'Stack the logs. Touch grass never.', cta: 'INSTALL', c1: '#ff6a00', c2: '#ff0080' },
  { app: 'Crocodilo Crush', emoji: '🐊', blurb: '10,000 levels of pure brainrot!', cta: 'PLAY FREE', c1: '#00ffa3', c2: '#0050ff' },
  { app: 'Cappuccino Clicker', emoji: '☕', blurb: 'Click coffee. Become unstoppable.', cta: 'GET', c1: '#7a1bff', c2: '#19e3ff' },
  { app: 'Shark Shoe Saga', emoji: '🦈', blurb: 'Three shoes. One destiny.', cta: 'INSTALL', c1: '#ff2e9a', c2: '#ffd166' },
];

let adTimer = null;

function playAd(reward) {
  const ad = FAKE_ADS[Math.floor(Math.random() * FAKE_ADS.length)];
  let left = 5;

  const skip = el('button', { class: 'ad-skip', text: `Reward in ${left}…` });
  const cta = el('button', { class: 'ad-cta', text: ad.cta });
  const ov = el('div', { class: 'ad-overlay', style: { background: `linear-gradient(150deg, ${ad.c1}, ${ad.c2})` } }, [
    el('div', { class: 'ad-tag', text: 'AD' }),
    skip,
    el('div', { class: 'ad-stage' }, [el('div', { class: 'ad-emoji', text: ad.emoji })]),
    el('div', { class: 'ad-card' }, [
      el('div', { class: 'ad-app-ico', text: ad.emoji }),
      el('div', { class: 'ad-app-info' }, [
        el('div', { class: 'ad-app-name', text: ad.app }),
        el('div', { class: 'ad-app-blurb', text: ad.blurb }),
        el('div', { class: 'ad-stars', text: '★★★★★ 4.9 · 10M+' }),
      ]),
      cta,
    ]),
  ]);
  document.body.appendChild(ov);
  requestAnimationFrame(() => ov.classList.add('show'));

  const done = () => {
    clearInterval(adTimer); adTimer = null;
    ov.classList.remove('show');
    setTimeout(() => ov.remove(), 280);
    grantAd(reward.id);
    toast(`${reward.title} claimed!`, { icon: reward.icon, color: '#7bffb0' });
    if (open) render();
  };

  adTimer = setInterval(() => {
    left -= 1;
    if (left > 0) { skip.textContent = `Reward in ${left}…`; }
    else { skip.textContent = '✓ Claim reward ✕'; skip.classList.add('ready'); skip.onclick = done; cta.onclick = done; }
  }, 1000);
}
