// ============================================================================
//  Meta progression — quests, premium gems, watch-ad rewards, the gem store,
//  timed boosts and mini-game payouts. All the "modern mobile game" scaffolding
//  that gives the idle core direction and active things to do.
// ============================================================================

import { state } from '../core/state.js';
import { bus } from '../core/events.js';
import { getRates } from './economy.js';
import { fuse, fusionCost, discoveredCount } from './fusion.js';
import { PRODUCTS, DEPARTMENTS } from '../core/config.js';

// --------------------------------------------------------------------------
//  Timed boosts + currencies
// --------------------------------------------------------------------------
export function setBoost(name, mult, seconds) {
  state.boosts[name] = { mult, until: Date.now() + seconds * 1000 };
  bus.emit('boost', { name, mult, seconds });
}

function incomePerSec() { return Math.max(1, getRates().money); }
function hypePerSec() { return Math.max(0.05, getRates().hype); }

// A free fusion that doesn't cost the player Hype (used by ad/gem rewards):
// top up exactly the next fusion's cost, then let fuse() consume it.
function freeFuse() { state.hype += fusionCost(); fuse(); }

// --------------------------------------------------------------------------
//  QUESTS — a guided chain that teaches the game and hands out rewards.
// --------------------------------------------------------------------------
function totalStaff() { let n = 0; for (const d of DEPARTMENTS) n += state.depts[d.id].workers; return n; }
function maxTier() { let t = 0; for (const d of DEPARTMENTS) t = Math.max(t, state.depts[d.id].tier); return t; }
function ownedProducts() { let n = 0; for (const p of PRODUCTS) if (state.products[p.id]) n++; return n; }

export const QUESTS = [
  { id: 'hire', icon: '🧑‍💻', title: 'Grow the team', desc: 'Have 7 staff working', target: 7, cur: totalStaff, reward: { cash: 200 } },
  { id: 'fans1', icon: '👥', title: 'Find an audience', desc: 'Reach 500 followers', target: 500, cur: () => Math.floor(state.followers), reward: { hype: 25 } },
  { id: 'desk', icon: '🖥️', title: 'Upgrade a desk', desc: 'Upgrade any workstation once', target: 1, cur: maxTier, reward: { gems: 3 } },
  { id: 'fuse', icon: '🧬', title: 'Enter the Lab', desc: 'Fuse your first meme', target: 1, cur: () => state.fusionsDone, reward: { hype: 40 } },
  { id: 'collect3', icon: '✦', title: 'Start a collection', desc: 'Discover 3 brainrot characters', target: 3, cur: discoveredCount, reward: { gems: 5 } },
  { id: 'cash5k', icon: '💰', title: 'First real payday', desc: 'Bank $5,000', target: 5000, cur: () => Math.floor(state.money), reward: { gems: 4 } },
  { id: 'prod2', icon: '🚀', title: 'Diversify', desc: 'Launch a 2nd product line', target: 2, cur: ownedProducts, reward: { hype: 120 } },
  { id: 'office', icon: '🏢', title: 'Bigger HQ', desc: 'Expand your office', target: 1, cur: () => state.officeLevel, reward: { gems: 6 } },
  { id: 'fans10k', icon: '📈', title: 'Going places', desc: 'Reach 10K followers', target: 10000, cur: () => Math.floor(state.followers), reward: { gems: 8 } },
  { id: 'collect8', icon: '🏆', title: 'Brainrot connoisseur', desc: 'Discover 8 characters', target: 8, cur: discoveredCount, reward: { gems: 14 } },
];

export function currentQuest() {
  if (state.questStep >= QUESTS.length) return null;
  const q = QUESTS[state.questStep];
  return { def: q, cur: Math.min(q.cur(), q.target), target: q.target };
}

export function checkQuests() {
  let guard = 0;
  while (state.questStep < QUESTS.length && guard++ < 50) {
    const q = QUESTS[state.questStep];
    if (q.cur() >= q.target) {
      grantReward(q.reward);
      state.questStep++;
      bus.emit('questComplete', { quest: q, reward: q.reward });
    } else break;
  }
}

function grantReward(r) {
  if (r.cash) state.money += r.cash;
  if (r.hype) state.hype += r.hype;
  if (r.gems) state.gems += r.gems;
}

// --------------------------------------------------------------------------
//  WATCH-AD rewards — the classic "watch a short ad for a boost" loop.
//  The UI plays a (parody) ad, then calls grantAd(id).
// --------------------------------------------------------------------------
export const AD_REWARDS = [
  { id: 'double', icon: '⚡', title: '2× Income', desc: 'Double all income for 5 minutes', cooldown: 45, apply: () => setBoost('Ad 2×', 2, 300) },
  { id: 'cash', icon: '💰', title: 'Instant Cash', desc: 'Collect 2 hours of income instantly', cooldown: 120, apply: () => { state.money += incomePerSec() * 7200; } },
  { id: 'hype', icon: '🔥', title: 'Hype Drop', desc: 'A big batch of Hype', cooldown: 80, apply: () => { state.hype += Math.max(40, hypePerSec() * 900); } },
  { id: 'gems', icon: '💎', title: 'Free Gems', desc: 'Grab 5 gems, on the house', cooldown: 180, apply: () => { state.gems += 5; } },
];

export function adAvailable(id) { return Date.now() >= (state.adReadyAt[id] || 0); }
export function adRemaining(id) { return Math.max(0, ((state.adReadyAt[id] || 0) - Date.now()) / 1000); }
export function grantAd(id) {
  const def = AD_REWARDS.find((a) => a.id === id);
  if (!def || !adAvailable(id)) return;
  def.apply();
  state.adReadyAt[id] = Date.now() + def.cooldown * 1000;
  bus.emit('adReward', { id, def });
  bus.emit('purchase');
}

// --------------------------------------------------------------------------
//  GEM STORE — spend premium gems.
// --------------------------------------------------------------------------
export const GEM_SHOP = [
  { id: 'mega', icon: '🚀', title: 'Mega Boost', desc: '3× income for 15 minutes', cost: 8, apply: () => setBoost('Mega 3×', 3, 900) },
  { id: 'cash8h', icon: '💰', title: 'Big Payday', desc: 'Instantly collect 8 hours of income', cost: 12, apply: () => { state.money += incomePerSec() * 8 * 3600; } },
  { id: 'fuse5', icon: '🧬', title: 'Fusion 5-Pack', desc: 'Fuse 5 memes instantly', cost: 15, apply: () => { for (let i = 0; i < 5; i++) freeFuse(); } },
  { id: 'hypepack', icon: '🔥', title: 'Hype Cannon', desc: 'A towering pile of Hype', cost: 6, apply: () => { state.hype += Math.max(250, hypePerSec() * 3600); } },
];

export function buyGem(id) {
  const def = GEM_SHOP.find((g) => g.id === id);
  if (!def) return { ok: false, reason: 'Unknown item.' };
  if (state.gems < def.cost) return { ok: false, reason: 'Not enough gems — watch an ad for more!' };
  state.gems -= def.cost;
  def.apply();
  bus.emit('purchase');
  return { ok: true };
}

// --------------------------------------------------------------------------
//  MINI-GAME payout — quality is 0..1 (how good the player's timing was).
// --------------------------------------------------------------------------
export function applySprintResult(quality) {
  const cash = incomePerSec() * (15 + quality * 70);
  const hype = Math.max(5, hypePerSec() * 120 * (0.5 + quality));
  state.money += cash;
  state.hype += hype;
  let boost = null;
  if (quality > 0.9) { setBoost('Perfect Sprint 2×', 2, 60); boost = '2× income · 60s'; }
  bus.emit('purchase');
  return { cash, hype, boost, quality };
}
