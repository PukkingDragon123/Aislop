// ============================================================================
//  Game state + persistence + cost formulas (Zoo edition).
//  Two currencies: coins 🪙 (earned by your brainrot zoo) and tokens 🎟️
//  (won from quests, spent on gacha). The collection maps brainrotId -> level.
// ============================================================================

import { DEPARTMENTS, DECORATIONS, OFFICE_LEVELS, DESK_TIERS, ROSTER, UPGRADES, STATIONS, ECON } from './config.js';

const SAVE_KEY = 'aislop.save.v2';

export function defaultState() {
  const depts = {};
  for (const d of DEPARTMENTS) depts[d.id] = { workers: 0, tier: 0 };
  depts.creation.workers = 1; // one starter employee in the only unlocked dept

  const decorations = {};
  for (const d of DECORATIONS) decorations[d.id] = 0;
  const upgrades = {};
  for (const u of UPGRADES) upgrades[u.id] = 0;
  const stations = {};
  for (const s of STATIONS) stations[s.id] = 0;

  return {
    version: 2,
    money: 200,            // coins 🪙
    tokens: 5,             // 🎟️ gacha currency
    followers: 0,
    lifetimeMoney: 0,
    totalViral: 0,
    pulls: 0,              // gacha pulls performed
    bullies: 0,            // employees bullied (for an achievement)
    cleaned: 0,            // messes swept up (for an achievement)
    mess: 0,               // trash piles currently on the floor (income drag)
    questStep: 0,
    officeLevel: 0,
    depts,
    decorations,
    upgrades,
    stations,              // station id -> number built
    collection: { chimpanzini: 1 }, // start with one common exhibit
    achievements: {},      // unlocked achievement ids
    milestonesHit: {},
    startTime: Date.now(),
    lastSeen: Date.now(),
  };
}

function clampInt(v, fallbackOrMin = 0, max = Infinity) {
  const min = max === Infinity ? 0 : fallbackOrMin;
  const fallback = max === Infinity ? fallbackOrMin : 0;
  let n = Math.floor(Number(v));
  if (!Number.isFinite(n)) n = fallback;
  return Math.max(min, Math.min(max, n));
}
function numOr(v, fallback) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }

function reconcile(saved) {
  const base = defaultState();
  if (!saved || typeof saved !== 'object') return base;
  const s = { ...base, ...saved };
  s.depts = {};
  for (const d of DEPARTMENTS) {
    const sd = saved.depts?.[d.id] || {};
    s.depts[d.id] = { workers: clampInt(sd.workers, base.depts[d.id].workers), tier: clampInt(sd.tier, 0, DESK_TIERS.length - 1) };
  }
  s.decorations = {};
  for (const d of DECORATIONS) s.decorations[d.id] = clampInt(saved.decorations?.[d.id], 0);
  s.upgrades = {};
  for (const u of UPGRADES) s.upgrades[u.id] = clampInt(saved.upgrades?.[u.id], 0, u.max);
  s.stations = {};
  for (const st of STATIONS) s.stations[st.id] = clampInt(saved.stations?.[st.id], 0);
  s.achievements = { ...(saved.achievements || {}) };
  s.bullies = clampInt(saved.bullies, 0);
  s.cleaned = clampInt(saved.cleaned, 0);
  s.mess = 0; // transient: the office recomputes this at runtime
  s.collection = {};
  for (const c of ROSTER) if (saved.collection?.[c.id]) s.collection[c.id] = clampInt(saved.collection[c.id], 1);
  if (Object.keys(s.collection).length === 0) s.collection = { chimpanzini: 1 };
  s.milestonesHit = { ...(saved.milestonesHit || {}) };
  s.officeLevel = clampInt(saved.officeLevel, 0, OFFICE_LEVELS.length - 1);
  s.money = numOr(saved.money, base.money);
  s.tokens = numOr(saved.tokens, base.tokens);
  s.followers = numOr(saved.followers, 0);
  s.lifetimeMoney = numOr(saved.lifetimeMoney, 0);
  s.totalViral = numOr(saved.totalViral, 0);
  s.pulls = clampInt(saved.pulls, 0);
  s.questStep = clampInt(saved.questStep, 0);
  s.startTime = numOr(saved.startTime, Date.now());
  s.lastSeen = numOr(saved.lastSeen, Date.now());
  return s;
}

export let state = defaultState();

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { state = defaultState(); return { state, fresh: true }; }
    state = reconcile(JSON.parse(raw));
    return { state, fresh: false };
  } catch (err) {
    console.warn('[state] load failed, starting fresh', err);
    state = defaultState();
    return { state, fresh: true };
  }
}
export function saveState() {
  try { state.lastSeen = Date.now(); localStorage.setItem(SAVE_KEY, JSON.stringify(state)); return true; }
  catch (err) { console.warn('[state] save failed', err); return false; }
}
export function resetState() { state = defaultState(); saveState(); return state; }
export function exportSave() { return btoa(unescape(encodeURIComponent(JSON.stringify(state)))); }
export function importSave(code) { state = reconcile(JSON.parse(decodeURIComponent(escape(atob(code.trim()))))); saveState(); return state; }

// --- cost formulas ---------------------------------------------------------
export function hireCost(deptId) {
  const d = DEPARTMENTS.find((x) => x.id === deptId);
  return Math.floor(d.baseHireCost * Math.pow(d.hireGrowth, state.depts[deptId].workers));
}
export function deskUpgradeCost(deptId) {
  const tier = state.depts[deptId].tier;
  if (tier >= DESK_TIERS.length - 1) return Infinity;
  const idx = DEPARTMENTS.findIndex((x) => x.id === deptId);
  return Math.floor(140 * Math.pow(11, tier) * (1 + idx * 0.15));
}
export function decoCost(id) {
  const d = DECORATIONS.find((x) => x.id === id);
  return Math.floor(d.cost * Math.pow(1.55, state.decorations[id]));
}
export function officeUpgradeCost() {
  const next = state.officeLevel + 1;
  if (next >= OFFICE_LEVELS.length) return Infinity;
  return OFFICE_LEVELS[next].cost;
}
export function gachaCoinCost() {
  return Math.floor(ECON.gachaBaseCoin * Math.pow(ECON.gachaCoinGrowth, state.pulls));
}
export function upgradeCost(id) {
  const u = UPGRADES.find((x) => x.id === id);
  const lvl = state.upgrades[id] || 0;
  if (lvl >= u.max) return Infinity;
  return Math.floor(u.baseCost * Math.pow(u.growth, lvl));
}
export function stationCost(id) {
  const s = STATIONS.find((x) => x.id === id);
  return Math.floor(s.baseCost * Math.pow(s.growth, state.stations[id] || 0));
}
export function totalStations() { return STATIONS.reduce((n, s) => n + (state.stations[s.id] || 0), 0); }
export function stationTypesOwned() { return STATIONS.reduce((n, s) => n + ((state.stations[s.id] || 0) > 0 ? 1 : 0), 0); }

// --- derived ---------------------------------------------------------------
export function totalWorkers() { return DEPARTMENTS.reduce((s, d) => s + state.depts[d.id].workers, 0); }
export function capacity() { return OFFICE_LEVELS[state.officeLevel].capacity; }
export function atCapacity() { return totalWorkers() >= capacity(); }
