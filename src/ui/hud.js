// ============================================================================
//  Top HUD — currencies (money / followers / Hype / gems), a quest tracker,
//  the trending pill and active-boost chips. Rebuilt cheaply each frame.
// ============================================================================

import { el } from './dom.js';
import { state, capacity, totalWorkers } from '../core/state.js';
import { OFFICE_LEVELS } from '../core/config.js';
import { fmt, money, rate, duration } from '../core/format.js';
import { getRates, getViralTimer, getTrend, getActiveBoosts } from '../sim/economy.js';
import { currentQuest } from '../sim/meta.js';
import { bus } from '../core/events.js';

let refs = {};

export function initHud(container) {
  const moneyStat = stat('💰', 'money', '#49e07d');
  const folStat = stat('👥', 'followers', '#6cc6ff');
  const hypeStat = stat('⚡', 'hype', '#ffd166');
  const gemStat = stat('💎', 'gems', '#19e3ff');
  gemStat.box.classList.add('tappable');
  gemStat.box.addEventListener('click', () => bus.emit('ui:store'));

  refs = {
    money: moneyStat.value, moneyRate: moneyStat.sub,
    fol: folStat.value, folRate: folStat.sub,
    hype: hypeStat.value, hypeRate: hypeStat.sub,
    gems: gemStat.value, gemsSub: gemStat.sub,
  };
  refs.gemsSub.textContent = 'tap for +';

  refs.office = el('div', { class: 'hud-office' });
  refs.viral = el('div', { class: 'hud-viral hidden', html: '🔥 VIRAL <span></span>' });
  refs.viralTime = () => refs.viral.querySelector('span');

  // Secondary row: quest tracker + trend + boosts (wraps on small screens).
  refs.quest = el('div', { class: 'quest-chip', onclick: () => bus.emit('ui:quests') }, [
    el('div', { class: 'quest-ico' }),
    el('div', { class: 'quest-main' }, [
      el('div', { class: 'quest-title' }),
      el('div', { class: 'quest-bar' }, [el('div', { class: 'quest-fill' })]),
    ]),
    el('div', { class: 'quest-prog' }),
  ]);
  refs.trend = el('div', { class: 'hud-trend hidden' });
  refs.boosts = el('div', { class: 'boost-row' });
  const sub = el('div', { class: 'hud-sub' }, [refs.quest, refs.trend, refs.boosts]);

  const bar = el('div', { class: 'hud' }, [
    el('div', { class: 'hud-brand' }, [
      el('div', { class: 'hud-logo', text: '🤖' }),
      el('div', {}, [
        el('div', { class: 'hud-title', text: 'AI SLOP.CO' }),
        refs.office,
      ]),
    ]),
    el('div', { class: 'hud-stats' }, [moneyStat.box, folStat.box, hypeStat.box, gemStat.box]),
    refs.viral,
  ]);
  container.append(bar, sub);
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
  refs.money.textContent = money(state.money);
  refs.moneyRate.textContent = rate(r.money);
  refs.fol.textContent = fmt(state.followers);
  refs.folRate.textContent = rate(r.followers, '');
  refs.hype.textContent = fmt(state.hype);
  refs.hypeRate.textContent = rate(r.hype, '');
  refs.gems.textContent = fmt(state.gems);

  const lvl = OFFICE_LEVELS[state.officeLevel];
  refs.office.textContent = `${lvl.name} · ${totalWorkers()}/${capacity()} staff`;

  // Viral.
  const vt = getViralTimer();
  if (vt > 0) { refs.viral.classList.remove('hidden'); refs.viralTime().textContent = duration(vt); }
  else refs.viral.classList.add('hidden');

  // Quest tracker.
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
    refs.quest.querySelector('.quest-title').textContent = 'All quests complete!';
    refs.quest.querySelector('.quest-prog').textContent = '✓';
    refs.quest.querySelector('.quest-fill').style.width = '100%';
  }

  // Trend.
  const trend = getTrend();
  if (trend) {
    const owned = !!state.discovered[trend.id];
    refs.trend.classList.remove('hidden');
    refs.trend.classList.toggle('owned', owned);
    refs.trend.innerHTML = `🔥 <b>${trend.emoji.join('')}</b> ${trend.name}${owned ? ' <span>✓ +' + Math.round(trend.mult * 100) + '%</span>' : ''}`;
  } else refs.trend.classList.add('hidden');

  // Active boosts.
  const boosts = getActiveBoosts();
  refs.boosts.innerHTML = '';
  for (const b of boosts) {
    refs.boosts.appendChild(el('div', { class: 'boost-chip', html: `🚀 <b>${b.mult}×</b> ${duration(b.remaining)}` }));
  }
}
