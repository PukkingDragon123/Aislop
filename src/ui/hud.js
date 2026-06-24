// ============================================================================
//  Top HUD — coins 🪙, tokens 🎟️, followers 👥, a quest tracker, and the
//  ever-filling DOPAMINE meter. Rebuilt cheaply every frame.
// ============================================================================

import { el } from './dom.js';
import { state, capacity, totalWorkers } from '../core/state.js';
import { OFFICE_LEVELS } from '../core/config.js';
import { fmt, money, rate, duration } from '../core/format.js';
import { getRates, getViralTimer, xpInfo } from '../sim/economy.js';
import { currentQuest } from '../sim/quests.js';
import { bus } from '../core/events.js';

let refs = {};
let lastMoney = -1;

export function initHud(container) {
  const coinStat = stat('🪙', 'coins', '#ffce47');
  const tokenStat = stat('🎟️', 'tokens', '#ff5db1');
  const folStat = stat('👥', 'followers', '#6cc6ff');
  tokenStat.box.classList.add('tappable');
  tokenStat.box.addEventListener('click', () => bus.emit('ui:gacha'));

  refs = {
    coins: coinStat.value, coinsRate: coinStat.sub,
    tokens: tokenStat.value, tokensSub: tokenStat.sub,
    fol: folStat.value, folRate: folStat.sub,
  };
  refs.tokensSub.textContent = 'gacha';

  refs.office = el('div', { class: 'hud-office' });
  refs.viral = el('div', { class: 'hud-viral hidden', html: '🔥 VIRAL <span></span>' });
  refs.viralTime = () => refs.viral.querySelector('span');

  refs.quest = el('div', { class: 'quest-chip', onclick: () => bus.emit('ui:quests') }, [
    el('div', { class: 'quest-ico' }),
    el('div', { class: 'quest-main' }, [
      el('div', { class: 'quest-title' }),
      el('div', { class: 'quest-bar' }, [el('div', { class: 'quest-fill' })]),
    ]),
    el('div', { class: 'quest-prog' }),
  ]);
  refs.level = el('div', { class: 'level-chip' }, [
    el('div', { class: 'level-num' }),
    el('div', { class: 'level-bar' }, [el('div', { class: 'level-fill' })]),
  ]);
  const sub = el('div', { class: 'hud-sub' }, [refs.level, refs.quest]);

  // Prominent income/sec readout, centred up top.
  refs.incomeTop = el('div', { class: 'income-top' }, [
    el('span', { class: 'income-ico', text: '🪙' }),
    el('span', { class: 'income-val' }),
    el('span', { class: 'income-unit', text: '/sec' }),
  ]);

  const bar = el('div', { class: 'hud' }, [
    el('div', { class: 'hud-brand' }, [
      el('div', { class: 'hud-logo', text: '🦠' }),
      el('div', {}, [el('div', { class: 'hud-title', text: 'BRAINROT ZOO' }), refs.office]),
    ]),
    el('div', { class: 'hud-stats' }, [coinStat.box, tokenStat.box, folStat.box]),
    refs.viral,
  ]);
  container.append(bar, sub, refs.incomeTop);
  update();
}

function stat(icon, key, color) {
  const value = el('div', { class: 'hud-val' });
  const sub = el('div', { class: 'hud-sub-line' });
  const box = el('div', { class: `hud-stat ${key}` }, [
    el('div', { class: 'hud-ico', text: icon, style: { color } }),
    el('div', {}, [value, sub]),
  ]);
  return { box, value, sub };
}

export function update() {
  const r = getRates();
  refs.coins.textContent = money(state.money);
  // Pop the coin counter on a discrete jump (click / reward), not steady income.
  if (lastMoney >= 0 && state.money - lastMoney > Math.max(8, lastMoney * 0.02)) {
    refs.coins.classList.remove('pop'); void refs.coins.offsetWidth; refs.coins.classList.add('pop');
  }
  lastMoney = state.money;
  refs.coinsRate.textContent = rate(r.money);
  refs.incomeTop.querySelector('.income-val').textContent = money(r.money);
  refs.tokens.textContent = fmt(state.tokens);
  refs.fol.textContent = fmt(state.followers);
  refs.folRate.textContent = rate(r.followers, '');

  const lvl = OFFICE_LEVELS[state.officeLevel];
  refs.office.textContent = `${lvl.name} · ${totalWorkers()}/${capacity()} staff`;

  const xi = xpInfo();
  refs.level.querySelector('.level-num').textContent = 'Lv ' + xi.level;
  refs.level.querySelector('.level-fill').style.width = `${Math.round(xi.progress * 100)}%`;

  const vt = getViralTimer();
  if (vt > 0) { refs.viral.classList.remove('hidden'); refs.viralTime().textContent = duration(vt); }
  else refs.viral.classList.add('hidden');

  const q = currentQuest();
  if (q) {
    refs.quest.classList.remove('done');
    refs.quest.querySelector('.quest-ico').textContent = q.def.icon;
    refs.quest.querySelector('.quest-title').textContent = q.def.title;
    refs.quest.querySelector('.quest-prog').textContent = `${fmt(q.cur)}/${fmt(q.target)}`;
    refs.quest.querySelector('.quest-fill').style.width = `${Math.min(100, (q.cur / q.target) * 100)}%`;
  } else {
    refs.quest.classList.add('done');
    refs.quest.querySelector('.quest-ico').textContent = '🏆';
    refs.quest.querySelector('.quest-title').textContent = 'All quests done!';
    refs.quest.querySelector('.quest-prog').textContent = '✓';
    refs.quest.querySelector('.quest-fill').style.width = '100%';
  }
}
