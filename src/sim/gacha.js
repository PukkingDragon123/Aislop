// ============================================================================
//  Gacha — "generate brainrot". Costs coins 🪙 + tokens 🎟️. Pulls weighted by
//  rarity; a new character enters the zoo at Lv 1, a duplicate FUSES into the
//  one you own (level up → more income). Single or 10-pull.
// ============================================================================

import { state, gachaCoinCost } from '../core/state.js';
import { ROSTER, RARITIES, ECON } from '../core/config.js';
import { bus } from '../core/events.js';

function weightedPick() {
  let total = 0;
  for (const c of ROSTER) total += RARITIES[c.rarity].weight;
  let r = Math.random() * total;
  for (const c of ROSTER) { r -= RARITIES[c.rarity].weight; if (r <= 0) return c; }
  return ROSTER[0];
}

// Cost of the next `n` pulls (coin cost rises each pull).
export function pullCost(multi = false) {
  const n = multi ? ECON.gachaMultiPulls : 1;
  let coins = 0;
  for (let i = 0; i < n; i++) coins += Math.floor(ECON.gachaBaseCoin * Math.pow(ECON.gachaCoinGrowth, state.pulls + i));
  const tokens = multi ? ECON.gachaMultiTokenCost : ECON.gachaTokenCost;
  return { coins, tokens, n };
}

export function canAffordPull(multi = false) {
  const c = pullCost(multi);
  return state.money >= c.coins && state.tokens >= c.tokens;
}

export function pull(multi = false) {
  const cost = pullCost(multi);
  if (state.tokens < cost.tokens) return { ok: false, reason: 'Out of tokens — finish a quest to earn more!' };
  if (state.money < cost.coins) return { ok: false, reason: 'Not enough coins.' };
  state.tokens -= cost.tokens;
  state.money -= cost.coins;

  const results = [];
  for (let i = 0; i < cost.n; i++) {
    state.pulls++;
    const c = weightedPick();
    const had = state.collection[c.id] || 0;
    state.collection[c.id] = had + 1;
    results.push({ char: c, isNew: had === 0, level: state.collection[c.id] });
  }
  bus.emit('pull', { results });
  bus.emit('purchase');
  return { ok: true, results };
}

// Helpers for UI / quests.
export function ownedCount() { return Object.keys(state.collection).length; }
export function maxLevel() { let m = 0; for (const id in state.collection) m = Math.max(m, state.collection[id]); return m; }
export const RARITY_RANK = { common: 0, rare: 1, epic: 2, legendary: 3, mythic: 4 };
export function ownsRarityAtLeast(rank) {
  for (const id in state.collection) {
    const c = ROSTER.find((x) => x.id === id);
    if (c && RARITY_RANK[c.rarity] >= rank) return true;
  }
  return false;
}
