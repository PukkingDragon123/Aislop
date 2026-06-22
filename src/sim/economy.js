// ============================================================================
//  Economy — the digital zoo + progression backbone.
//  Brainrots produce coins (rarity × level); employees, morale, followers,
//  viral spikes, UPGRADES and your COMPANY LEVEL all multiply the output.
//  XP = lifetime coins; clearing a level grants a permanent income bonus and
//  unlocks new departments / upgrades.
// ============================================================================

import { DEPARTMENTS, DESK_TIERS, DECORATIONS, MILESTONES, UPGRADES, ECON, ROSTER_BY_ID, RARITIES } from '../core/config.js';
import { state } from '../core/state.js';
import { bus } from '../core/events.js';

const live = {
  viralTimer: 0,
  rates: { money: 0, followers: 0 },
  level: 0, levelStart: 0, levelNeed: ECON.levelBaseXp,
};

export function getViralTimer() { return live.viralTimer; }
export function getRates() { return live.rates; }

// --- company level ---------------------------------------------------------
function needFor(L) { return ECON.levelBaseXp * Math.pow(ECON.levelGrowth, L); }
export function companyLevel() { return live.level; }
export function xpInfo() {
  const cur = state.lifetimeMoney - live.levelStart;
  return { level: live.level, cur, need: live.levelNeed, progress: Math.min(1, cur / live.levelNeed) };
}
export function initLevel() {
  live.level = 0; live.levelStart = 0; live.levelNeed = needFor(0);
  while (state.lifetimeMoney - live.levelStart >= live.levelNeed && live.level < 300) {
    live.levelStart += live.levelNeed; live.level++; live.levelNeed = needFor(live.level);
  }
}
function recomputeLevel() {
  while (state.lifetimeMoney - live.levelStart >= live.levelNeed && live.level < 300) {
    live.levelStart += live.levelNeed; live.level++; live.levelNeed = needFor(live.level);
    bus.emit('levelUp', { level: live.level });
  }
}

// --- upgrade effects -------------------------------------------------------
export function getUpgradeEffects() {
  const e = { income: 1, emp: 1, morale: 1, followers: 1, viralChance: 0, offline: 1, luck: 0, questTokens: 0 };
  for (const u of UPGRADES) { const l = state.upgrades[u.id] || 0; if (l > 0) u.apply(l, e); }
  return e;
}

// --- zoo income ------------------------------------------------------------
export function brainrotIncome() {
  let sum = 0;
  for (const id in state.collection) {
    const c = ROSTER_BY_ID[id];
    if (c) sum += RARITIES[c.rarity].income * state.collection[id];
  }
  return sum;
}
export function collectionCount() { return Object.keys(state.collection).length; }
export function employeeOutput() {
  let o = 0;
  for (const d of DEPARTMENTS) { const sd = state.depts[d.id]; o += sd.workers * d.baseRate * DESK_TIERS[sd.tier].mult; }
  return o;
}
export function deptPower(id) {
  const d = DEPARTMENTS.find((x) => x.id === id);
  const sd = state.depts[id];
  return sd.workers * d.baseRate * DESK_TIERS[sd.tier].mult;
}

export function computeModifiers() {
  const e = getUpgradeEffects();
  let morale = 0;
  for (const d of DECORATIONS) morale += state.decorations[d.id] * d.morale;
  const m = {
    effects: e,
    incomeMult: e.income * (1 + ECON.levelIncomeBonus * live.level),
    empMult: 1 + employeeOutput() * ECON.empPower * e.emp,
    moraleMult: 1 + morale * e.morale,
    audience: 1 + ECON.audienceBonus * Math.log10(1 + state.followers),
    viral: live.viralTimer > 0 ? ECON.viralMultiplier : 1,
    followersMult: e.followers,
    viralChance: ECON.viralBaseChance + e.viralChance,
    offlineMult: e.offline,
    luck: e.luck,
    questTokens: e.questTokens,
    morale, level: live.level,
  };
  m.total = m.incomeMult * m.empMult * m.moraleMult * m.audience * m.viral;
  return m;
}

export function incomePerSec(m = computeModifiers()) { return brainrotIncome() * m.total; }

export function tick(dt) {
  const m = computeModifiers();
  const base = brainrotIncome();

  if (base > 0 && live.viralTimer <= 0) {
    if (Math.random() < 1 - Math.exp(-m.viralChance * dt)) {
      live.viralTimer = ECON.viralDuration; state.totalViral++;
      bus.emit('viral', { multiplier: ECON.viralMultiplier });
    }
  }
  if (live.viralTimer > 0) live.viralTimer = Math.max(0, live.viralTimer - dt);

  const coins = base * m.total * dt;
  const followers = base * ECON.baseFollowers * m.audience * m.followersMult * (m.viral > 1 ? 3 : 1) * dt;

  state.money += coins;
  state.followers += followers;
  state.lifetimeMoney += coins;
  recomputeLevel();

  const k = Math.min(1, dt * 2.5);
  live.rates.money += (coins / dt - live.rates.money) * k;
  live.rates.followers += (followers / dt - live.rates.followers) * k;

  checkMilestones();
  if (coins > 0) bus.emit('earn', { coins, viral: m.viral > 1 });
  return { coins, followers };
}

export function grantCash(amount) { state.money += amount; state.lifetimeMoney += amount; recomputeLevel(); }

function checkMilestones() {
  for (const ms of MILESTONES) {
    if (!state.milestonesHit[ms.at] && state.followers >= ms.at) {
      state.milestonesHit[ms.at] = true;
      bus.emit('milestone', ms);
    }
  }
}

export function computeOffline(elapsedSec) {
  const seconds = Math.min(elapsedSec, ECON.offlineCap);
  if (seconds < 30) return null;
  const m = computeModifiers();
  const base = brainrotIncome();
  if (base <= 0) return null;
  const rate = base * m.incomeMult * m.empMult * m.moraleMult * m.audience * ECON.offlineRate * m.offlineMult;
  const coins = rate * seconds;
  const followers = base * ECON.baseFollowers * m.audience * m.followersMult * ECON.offlineRate * seconds;
  state.money += coins; state.followers += followers; state.lifetimeMoney += coins;
  recomputeLevel(); checkMilestones();
  return { seconds, money: coins, followers };
}
