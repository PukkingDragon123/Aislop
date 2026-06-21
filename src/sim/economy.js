// ============================================================================
//  Economy — the digital zoo.
//  Brainrots ARE the income: each owned character produces coins/sec by rarity
//  × level. Employees multiply that output, decorations add morale, followers
//  add an audience bonus, and viral spikes pour fuel on the fire.
// ============================================================================

import { DEPARTMENTS, DESK_TIERS, DECORATIONS, MILESTONES, ECON, ROSTER_BY_ID, RARITIES } from '../core/config.js';
import { state } from '../core/state.js';
import { bus } from '../core/events.js';

const live = {
  viralTimer: 0,
  rates: { money: 0, followers: 0 },
};

export function getViralTimer() { return live.viralTimer; }
export function getRates() { return live.rates; }

// Base coins/sec produced by the zoo (before any multipliers).
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
  for (const d of DEPARTMENTS) {
    const sd = state.depts[d.id];
    o += sd.workers * d.baseRate * DESK_TIERS[sd.tier].mult;
  }
  return o;
}
export function deptPower(id) {
  const d = DEPARTMENTS.find((x) => x.id === id);
  const sd = state.depts[id];
  return sd.workers * d.baseRate * DESK_TIERS[sd.tier].mult;
}

export function computeModifiers() {
  let morale = 0;
  for (const d of DECORATIONS) morale += state.decorations[d.id] * d.morale;
  const m = {
    moraleMult: 1 + morale,
    empMult: 1 + employeeOutput() * ECON.empPower,
    audience: 1 + ECON.audienceBonus * Math.log10(1 + state.followers),
    viral: live.viralTimer > 0 ? ECON.viralMultiplier : 1,
    morale,
  };
  m.total = m.empMult * m.moraleMult * m.audience * m.viral;
  return m;
}

export function incomePerSec(m = computeModifiers()) {
  return brainrotIncome() * m.total;
}

export function tick(dt) {
  const m = computeModifiers();
  const base = brainrotIncome();

  if (base > 0 && live.viralTimer <= 0) {
    if (Math.random() < 1 - Math.exp(-ECON.viralBaseChance * dt)) {
      live.viralTimer = ECON.viralDuration;
      state.totalViral++;
      bus.emit('viral', { multiplier: ECON.viralMultiplier });
    }
  }
  if (live.viralTimer > 0) live.viralTimer = Math.max(0, live.viralTimer - dt);

  const coins = base * m.total * dt;
  const followers = base * ECON.baseFollowers * m.audience * (m.viral > 1 ? 3 : 1) * dt;

  state.money += coins;
  state.followers += followers;
  state.lifetimeMoney += coins;

  const k = Math.min(1, dt * 2.5);
  live.rates.money += (coins / dt - live.rates.money) * k;
  live.rates.followers += (followers / dt - live.rates.followers) * k;

  checkMilestones();
  if (coins > 0) bus.emit('earn', { coins, viral: m.viral > 1 });
  return { coins, followers };
}

// External one-off cash injection (e.g. the Orca Tank investor offer).
export function grantCash(amount) {
  state.money += amount;
  state.lifetimeMoney += amount;
}

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
  const rate = base * m.empMult * m.moraleMult * m.audience * ECON.offlineRate;
  const coins = rate * seconds;
  const followers = base * ECON.baseFollowers * m.audience * ECON.offlineRate * seconds;
  state.money += coins;
  state.followers += followers;
  state.lifetimeMoney += coins;
  checkMilestones();
  return { seconds, money: coins, followers };
}
