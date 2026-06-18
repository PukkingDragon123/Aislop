// ============================================================================
//  Player actions — the only sanctioned way to mutate purchasable state.
//  Each returns { ok, reason } so the UI can give precise feedback, and emits
//  a semantic event so the 3D world can react (spawn a worker, swap a desk…).
// ============================================================================

import { state, hireCost, deskUpgradeCost, decoCost, upgradeCost, officeUpgradeCost, atCapacity } from '../core/state.js';
import { DESK_TIERS, PRODUCTS, UPGRADES, OFFICE_LEVELS } from '../core/config.js';
import { bus } from '../core/events.js';

function fail(reason) { return { ok: false, reason }; }
function done(extra) { bus.emit('purchase'); return { ok: true, ...extra }; }

export function hire(deptId) {
  if (atCapacity()) return fail('Office is full — expand or upgrade your office.');
  const cost = hireCost(deptId);
  if (state.money < cost) return fail('Not enough cash.');
  state.money -= cost;
  state.depts[deptId].workers++;
  bus.emit('hired', { deptId, index: state.depts[deptId].workers - 1 });
  return done({ cost });
}

export function upgradeDesk(deptId) {
  const d = state.depts[deptId];
  if (d.tier >= DESK_TIERS.length - 1) return fail('Already at max desk tier.');
  if (d.workers <= 0) return fail('Hire someone first.');
  const cost = deskUpgradeCost(deptId);
  if (state.money < cost) return fail('Not enough cash.');
  state.money -= cost;
  d.tier++;
  bus.emit('deskUpgraded', { deptId, tier: d.tier });
  return done({ cost, tier: d.tier });
}

export function buyDecoration(id) {
  const cost = decoCost(id);
  if (state.money < cost) return fail('Not enough cash.');
  state.money -= cost;
  state.decorations[id]++;
  bus.emit('decoAdded', { id, index: state.decorations[id] - 1 });
  return done({ cost });
}

export function buyProduct(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return fail('Unknown product.');
  if (state.products[id]) return fail('Already launched.');
  if (state.followers < p.followerReq) return fail(`Needs ${p.followerReq} followers.`);
  if (state.money < p.cost) return fail('Not enough cash.');
  state.money -= p.cost;
  state.products[id] = true;
  bus.emit('productBought', { id });
  return done({ cost: p.cost });
}

export function buyUpgrade(id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return fail('Unknown upgrade.');
  if (state.upgrades[id] >= u.max) return fail('Maxed out.');
  const cost = upgradeCost(id);
  if (state.money < cost) return fail('Not enough cash.');
  state.money -= cost;
  state.upgrades[id]++;
  bus.emit('upgradeBought', { id, level: state.upgrades[id] });
  return done({ cost, level: state.upgrades[id] });
}

export function expandOffice() {
  const next = state.officeLevel + 1;
  if (next >= OFFICE_LEVELS.length) return fail('Already the largest campus.');
  const cost = officeUpgradeCost();
  if (state.money < cost) return fail('Not enough cash.');
  state.money -= cost;
  state.officeLevel = next;
  bus.emit('officeExpanded', { level: next });
  return done({ cost, level: next });
}
