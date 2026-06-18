// ============================================================================
//  Game state + persistence + cost formulas
// ----------------------------------------------------------------------------
//  State is intentionally just numbers/flags — the 3D office layout is derived
//  deterministically from these counts (see world/office.js), so saving is a
//  tiny JSON blob and the world can always be rebuilt from it.
// ============================================================================

import { DEPARTMENTS, DECORATIONS, PRODUCTS, UPGRADES, OFFICE_LEVELS, DESK_TIERS } from './config.js';

const SAVE_KEY = 'aislop.save.v1';

export function defaultState() {
  const depts = {};
  for (const d of DEPARTMENTS) depts[d.id] = { workers: 0, tier: 0 };
  // Start the player with one worker in each stage so the pipeline flows from
  // second one — idle games should always feel alive immediately.
  depts.trends.workers = 1;
  depts.creation.workers = 1;
  depts.editing.workers = 1;
  depts.publishing.workers = 1;
  depts.marketing.workers = 1;

  const decorations = {};
  for (const d of DECORATIONS) decorations[d.id] = 0;
  const products = {};
  for (const p of PRODUCTS) products[p.id] = false;
  products.videos = true; // AI Videos line is free from the start.
  const upgrades = {};
  for (const u of UPGRADES) upgrades[u.id] = 0;

  return {
    version: 1,
    money: 60,
    followers: 0,
    lifetimeMoney: 0,
    lifetimePublished: 0,
    totalViral: 0,
    officeLevel: 0,
    depts,
    buffers: { idea: 0, raw: 0, polished: 0, published: 0 },
    decorations,
    products,
    upgrades,
    milestonesHit: {},
    startTime: Date.now(),
    lastSeen: Date.now(),
  };
}

// Deep-ish merge so old saves survive new config keys.
function reconcile(saved) {
  const base = defaultState();
  if (!saved || typeof saved !== 'object') return base;
  const s = { ...base, ...saved };
  s.depts = {};
  for (const d of DEPARTMENTS) {
    const sd = saved.depts?.[d.id] || {};
    s.depts[d.id] = {
      workers: clampInt(sd.workers, base.depts[d.id].workers),
      tier: clampInt(sd.tier, 0, DESK_TIERS.length - 1),
    };
  }
  s.buffers = { ...base.buffers, ...(saved.buffers || {}) };
  s.decorations = {};
  for (const d of DECORATIONS) s.decorations[d.id] = clampInt(saved.decorations?.[d.id], 0);
  s.products = { ...base.products };
  for (const p of PRODUCTS) if (saved.products?.[p.id]) s.products[p.id] = true;
  s.products.videos = true;
  s.upgrades = {};
  for (const u of UPGRADES) s.upgrades[u.id] = clampInt(saved.upgrades?.[u.id], 0, u.max);
  s.milestonesHit = { ...(saved.milestonesHit || {}) };
  s.officeLevel = clampInt(saved.officeLevel, 0, OFFICE_LEVELS.length - 1);
  s.money = numOr(saved.money, base.money);
  s.followers = numOr(saved.followers, 0);
  s.lifetimeMoney = numOr(saved.lifetimeMoney, 0);
  s.lifetimePublished = numOr(saved.lifetimePublished, 0);
  s.totalViral = numOr(saved.totalViral, 0);
  s.startTime = numOr(saved.startTime, Date.now());
  s.lastSeen = numOr(saved.lastSeen, Date.now());
  return s;
}

function clampInt(v, fallbackOrMin = 0, max = Infinity) {
  const min = max === Infinity ? 0 : fallbackOrMin;
  const fallback = max === Infinity ? fallbackOrMin : 0;
  let n = Math.floor(Number(v));
  if (!Number.isFinite(n)) n = fallback;
  return Math.max(min, Math.min(max, n));
}
function numOr(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Live game state (mutable singleton).
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
  try {
    state.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.warn('[state] save failed', err);
    return false;
  }
}

export function resetState() {
  state = defaultState();
  saveState();
  return state;
}

export function exportSave() {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function importSave(code) {
  const parsed = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  state = reconcile(parsed);
  saveState();
  return state;
}

// --------------------------------------------------------------------------
//  Cost formulas (pure helpers)
// --------------------------------------------------------------------------

export function hireCost(deptId) {
  const d = DEPARTMENTS.find((x) => x.id === deptId);
  return Math.floor(d.baseHireCost * Math.pow(d.hireGrowth, state.depts[deptId].workers));
}

export function deskUpgradeCost(deptId) {
  const dept = DEPARTMENTS.find((x) => x.id === deptId);
  const tier = state.depts[deptId].tier;
  if (tier >= DESK_TIERS.length - 1) return Infinity;
  const deptIndex = DEPARTMENTS.indexOf(dept);
  // Grows steeply per tier; later stages cost a touch more.
  return Math.floor(140 * Math.pow(11, tier) * (1 + deptIndex * 0.15));
}

export function decoCost(id) {
  const d = DECORATIONS.find((x) => x.id === id);
  return Math.floor(d.cost * Math.pow(1.55, state.decorations[id]));
}

export function upgradeCost(id) {
  const u = UPGRADES.find((x) => x.id === id);
  const lvl = state.upgrades[id];
  if (lvl >= u.max) return Infinity;
  return Math.floor(u.baseCost * Math.pow(u.growth, lvl));
}

export function officeUpgradeCost() {
  const next = state.officeLevel + 1;
  if (next >= OFFICE_LEVELS.length) return Infinity;
  return OFFICE_LEVELS[next].cost;
}

// --------------------------------------------------------------------------
//  Derived helpers
// --------------------------------------------------------------------------

export function totalWorkers() {
  return DEPARTMENTS.reduce((sum, d) => sum + state.depts[d.id].workers, 0);
}

export function deskCount() {
  // One desk per worker, plus an empty "ready to staff" desk is not modelled;
  // capacity is measured in desks == workers here.
  return totalWorkers();
}

export function capacity() {
  return OFFICE_LEVELS[state.officeLevel].capacity;
}

export function atCapacity() {
  return totalWorkers() >= capacity();
}

export function ownedProducts() {
  return PRODUCTS.filter((p) => state.products[p.id]);
}
