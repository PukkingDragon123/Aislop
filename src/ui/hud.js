// ============================================================================
//  Top HUD — money, followers, live rates, office tier, viral indicator.
//  Rebuilt cheaply each frame from state + sim rates.
// ============================================================================

import { el } from './dom.js';
import { state, capacity, totalWorkers } from '../core/state.js';
import { OFFICE_LEVELS } from '../core/config.js';
import { fmt, money, rate, duration } from '../core/format.js';
import { getRates, getViralTimer, getTrend } from '../sim/economy.js';

let refs = {};

export function initHud(container) {
  const moneyStat = stat('💰', 'money', '#49e07d');
  const folStat = stat('👥', 'followers', '#6cc6ff');
  const hypeStat = stat('⚡', 'hype', '#ffd166');
  refs = {
    money: moneyStat.value, moneyRate: moneyStat.sub,
    fol: folStat.value, folRate: folStat.sub,
    hype: hypeStat.value, hypeRate: hypeStat.sub,
  };

  refs.office = el('div', { class: 'hud-office' });
  refs.viral = el('div', { class: 'hud-viral hidden', html: '🔥 VIRAL <span></span>' });
  refs.viralTime = () => refs.viral.querySelector('span');
  refs.trend = el('div', { class: 'hud-trend hidden' });

  const bar = el('div', { class: 'hud' }, [
    el('div', { class: 'hud-brand' }, [
      el('div', { class: 'hud-logo', text: '🤖' }),
      el('div', {}, [
        el('div', { class: 'hud-title', text: 'AI SLOP.CO' }),
        refs.office,
      ]),
    ]),
    el('div', { class: 'hud-stats' }, [moneyStat.box, folStat.box, hypeStat.box]),
    refs.viral,
    refs.trend,
  ]);
  container.appendChild(bar);
  update();
}

function stat(icon, key, color) {
  const value = el('div', { class: 'hud-val' });
  const sub = el('div', { class: 'hud-sub' });
  const box = el('div', { class: `hud-stat ${key}` }, [
    el('div', { class: 'hud-ico', text: icon, style: { color } }),
    el('div', {}, [value, sub]),
  ]);
  return { box, value, sub };
}

export function update() {
  const r = getRates();
  refs.money.textContent = money(state.money);
  refs.moneyRate.textContent = rate(r.money);
  refs.fol.textContent = fmt(state.followers);
  refs.folRate.textContent = rate(r.followers, '');
  refs.hype.textContent = fmt(state.hype);
  refs.hypeRate.textContent = rate(r.hype, '');

  const lvl = OFFICE_LEVELS[state.officeLevel];
  refs.office.textContent = `${lvl.name} · ${totalWorkers()}/${capacity()} staff`;

  const trend = getTrend();
  if (trend) {
    const owned = !!state.discovered[trend.id];
    refs.trend.classList.remove('hidden');
    refs.trend.classList.toggle('owned', owned);
    refs.trend.innerHTML = `🔥 <b>${trend.emoji.join('')}</b> ${trend.name}${owned ? ' <span>✓ +' + Math.round(trend.mult * 100) + '%</span>' : ''}`;
  } else {
    refs.trend.classList.add('hidden');
  }

  const vt = getViralTimer();
  if (vt > 0) {
    refs.viral.classList.remove('hidden');
    refs.viralTime().textContent = duration(vt);
  } else {
    refs.viral.classList.add('hidden');
  }
}
