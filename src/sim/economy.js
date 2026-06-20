// ============================================================================
//  Economy simulation — the production pipeline
// ----------------------------------------------------------------------------
//  Ideas → Raw → Polished → Published → (Marketing) → money + followers.
//  Each stage's throughput = workers × baseRate × deskTier × efficiency.
//  Buffers between stages have a cap and apply BACK-PRESSURE, so an
//  understaffed stage starves everything downstream while upstream buffers
//  fill — making "balance your workforce" a real, visible decision.
// ============================================================================

import {
  DEPARTMENTS, DESK_TIERS, DECORATIONS, PRODUCTS, UPGRADES, MILESTONES, ECON,
  ROSTER, RARITIES,
} from '../core/config.js';
import { state } from '../core/state.js';
import { bus } from '../core/events.js';

// Transient (non-saved) sim state.
const live = {
  viralTimer: 0,          // seconds remaining of an active viral spike
  rates: { money: 0, followers: 0, pieces: 0, hype: 0 }, // smoothed per-second, for HUD
  bottleneck: null,       // dept id of the current limiting stage
  trend: null,            // { id, name, rarity, mult, emoji } currently trending
  trendTimer: 0,
};

export function getViralTimer() { return live.viralTimer; }
export function getRates() { return live.rates; }
export function getBottleneck() { return live.bottleneck; }
export function getTrend() { return live.trend; }

// Pick a new trending character (called on a timer + once at boot).
function pickTrend(emit = true) {
  const c = ROSTER[Math.floor(Math.random() * ROSTER.length)];
  live.trend = { id: c.id, name: c.name, rarity: c.rarity, mult: RARITIES[c.rarity].trendMult, emoji: c.emoji };
  live.trendTimer = ECON.trendInterval;
  if (emit) bus.emit('trend', live.trend);
}
export function initTrend() { if (!live.trend) pickTrend(false); }

// --------------------------------------------------------------------------
//  Aggregate every modifier source into a single multiplier bundle.
// --------------------------------------------------------------------------
export function computeModifiers() {
  const m = {
    efficiency: 1,                 // scales every stage's rate
    value: 1,                      // $ per piece
    buffer: 1,                     // buffer capacity
    viralChance: ECON.viralBaseChance,
    followers: 1,                  // follower gain
    sponsor: 0,                    // passive % of revenue
  };

  // Upgrades.
  for (const u of UPGRADES) {
    const lvl = state.upgrades[u.id];
    if (lvl > 0) u.apply(lvl, m);
  }

  // Decorations → morale → efficiency.
  let morale = 0;
  for (const d of DECORATIONS) morale += state.decorations[d.id] * d.morale;
  m.efficiency *= 1 + morale;
  m.morale = morale;

  // Owned products stack revenue + follower multipliers.
  let rev = 0, fol = 0;
  for (const p of PRODUCTS) {
    if (state.products[p.id]) { rev += p.revMult; fol += p.folMult; }
  }
  m.productRev = Math.max(1, rev);
  m.productFol = Math.max(1, fol);

  // Collection: each discovered brainrot character compounds a global multiplier.
  let collection = 1;
  for (const c of ROSTER) if (state.discovered[c.id]) collection *= 1 + RARITIES[c.rarity].collectMult;
  m.collection = collection;

  // Trend: if the currently-trending character is in your collection, big boost.
  m.trend = (live.trend && state.discovered[live.trend.id]) ? 1 + live.trend.mult : 1;
  m.trendActive = m.trend > 1;

  // Timed boosts (from watch-ad rewards, gem purchases, mini-games).
  const now = Date.now();
  let boost = 1;
  for (const k in state.boosts) { const b = state.boosts[k]; if (b && b.until > now) boost *= b.mult; }
  m.boost = boost;

  return m;
}

// Active timed boosts, for the HUD chips.
export function getActiveBoosts() {
  const now = Date.now();
  const out = [];
  for (const k in state.boosts) {
    const b = state.boosts[k];
    if (b && b.until > now) out.push({ name: k, mult: b.mult, remaining: (b.until - now) / 1000 });
  }
  return out;
}

// Capacity (units/sec) of a single stage given current staff + modifiers.
export function stageCapacity(deptId, m = computeModifiers()) {
  const d = state.depts[deptId];
  const def = DEPARTMENTS.find((x) => x.id === deptId);
  return d.workers * def.baseRate * DESK_TIERS[d.tier].mult * m.efficiency;
}

// Steady-state pipeline throughput = the slowest stage (the bottleneck).
export function throughput(m = computeModifiers()) {
  let min = Infinity, who = null;
  for (const def of DEPARTMENTS) {
    const c = stageCapacity(def.id, m);
    if (c < min) { min = c; who = def.id; }
  }
  live.bottleneck = who;
  return min === Infinity ? 0 : min;
}

// Per-piece economics at this instant (followers feed back into value).
function pieceEconomics(m) {
  const audienceMult = 1 + ECON.audienceBonus * Math.log10(1 + state.followers);
  const value = ECON.baseValue * m.value * m.productRev * audienceMult * m.collection * m.trend * m.boost;
  const followers = ECON.baseFollowers * m.followers * m.productFol * m.collection * m.trend * m.boost;
  return { value, followers };
}

// --------------------------------------------------------------------------
//  Main tick — advance the simulation by dt seconds.
// --------------------------------------------------------------------------
export function tick(dt) {
  const m = computeModifiers();
  const bufMax = ECON.baseBuffer * m.buffer;
  const b = state.buffers;

  // Stage 1: Trend Lab generates ideas (no upstream input).
  const ideaIn = stageCapacity('trends', m) * dt;
  b.idea = Math.min(bufMax, b.idea + ideaIn);

  // Stages 2-4: consume upstream buffer, limited by downstream space (back-pressure).
  const flowCreation = move(b, 'idea', 'raw', stageCapacity('creation', m) * dt, bufMax);
  const flowEditing = move(b, 'raw', 'polished', stageCapacity('editing', m) * dt, bufMax);
  const flowPublish = move(b, 'polished', 'published', stageCapacity('publishing', m) * dt, bufMax);

  // Stage 5: Marketing consumes published pieces → money + followers.
  const marketed = Math.min(stageCapacity('marketing', m) * dt, b.published);
  b.published -= marketed;

  let moneyEarned = 0, followersEarned = 0;
  let viralNow = false;

  if (marketed > 0) {
    const econ = pieceEconomics(m);

    // Maybe trigger a viral spike (only while actually publishing).
    if (live.viralTimer <= 0) {
      const p = 1 - Math.exp(-m.viralChance * dt);
      if (Math.random() < p) {
        live.viralTimer = ECON.viralDuration;
        state.totalViral++;
        viralNow = true;
        bus.emit('viral', { multiplier: ECON.viralMultiplier });
      }
    }
    const viralFactor = live.viralTimer > 0 ? ECON.viralMultiplier : 1;

    moneyEarned = marketed * econ.value * viralFactor;
    followersEarned = marketed * econ.followers * viralFactor;
    moneyEarned *= 1 + m.sponsor; // sponsorship deals top up revenue
  }

  if (live.viralTimer > 0) live.viralTimer = Math.max(0, live.viralTimer - dt);

  // Rotate the trending character on a timer.
  live.trendTimer -= dt;
  if (live.trendTimer <= 0) pickTrend();

  // Commit.
  const hypeEarned = marketed * ECON.hypePerPiece;
  state.money += moneyEarned;
  state.followers += followersEarned;
  state.hype += hypeEarned;
  state.lifetimeMoney += moneyEarned;
  state.lifetimePublished += marketed;

  // Smoothed rates for the HUD (EMA).
  const k = Math.min(1, dt * 2.5);
  live.rates.money += (moneyEarned / dt - live.rates.money) * k;
  live.rates.followers += (followersEarned / dt - live.rates.followers) * k;
  live.rates.pieces += (marketed / dt - live.rates.pieces) * k;
  live.rates.hype += (hypeEarned / dt - live.rates.hype) * k;
  throughput(m); // refresh bottleneck id

  checkMilestones();

  if (marketed > 0) {
    bus.emit('published', {
      pieces: marketed, money: moneyEarned, followers: followersEarned,
      viral: live.viralTimer > 0,
    });
  }

  return { moneyEarned, followersEarned, marketed, flowCreation, flowEditing, flowPublish, viralNow };
}

// Move up to `amount` units from buffer `from` into `to`, capped by `to` space.
function move(b, from, to, amount, bufMax) {
  const space = bufMax - b[to];
  const moved = Math.max(0, Math.min(amount, b[from], space));
  b[from] -= moved;
  b[to] += moved;
  return moved;
}

function checkMilestones() {
  for (const ms of MILESTONES) {
    if (!state.milestonesHit[ms.at] && state.followers >= ms.at) {
      state.milestonesHit[ms.at] = true;
      bus.emit('milestone', ms);
    }
  }
}

// --------------------------------------------------------------------------
//  Offline progress — credit a fraction of steady-state throughput for the
//  time the tab was closed (capped). No viral spikes while away.
// --------------------------------------------------------------------------
export function computeOffline(elapsedSec) {
  const seconds = Math.min(elapsedSec, ECON.offlineCap);
  if (seconds < 30) return null; // ignore tiny gaps

  const m = computeModifiers();
  const tp = throughput(m); // pieces/sec at the bottleneck
  if (tp <= 0) return null;

  const econ = pieceEconomics(m);
  const pieces = tp * seconds * ECON.offlineRate;
  const money = pieces * econ.value * (1 + m.sponsor);
  const followers = pieces * econ.followers;
  const hype = pieces * ECON.hypePerPiece;

  state.money += money;
  state.followers += followers;
  state.hype += hype;
  state.lifetimeMoney += money;
  state.lifetimePublished += pieces;
  checkMilestones();

  return { seconds, money, followers, pieces, hype };
}
