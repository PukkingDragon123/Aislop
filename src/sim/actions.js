// ============================================================================
//  Build actions — the only sanctioned way to grow the office/zoo. Each returns
//  { ok, reason } and emits an event the 3D world reacts to.
// ============================================================================

import { state, hireCost, deskUpgradeCost, decoCost, officeUpgradeCost, upgradeCost, stationCost, atCapacity } from '../core/state.js';
import { DESK_TIERS, OFFICE_LEVELS, DEPARTMENTS, UPGRADES, STATION_BY_ID } from '../core/config.js';
import { companyLevel } from './economy.js';
import { bus } from '../core/events.js';

function fail(reason) { return { ok: false, reason }; }
function done(extra) { bus.emit('purchase'); return { ok: true, ...extra }; }

export function hire(deptId) {
  const def = DEPARTMENTS.find((d) => d.id === deptId);
  if (companyLevel() < def.unlockLevel) return fail(`Unlocks at Level ${def.unlockLevel}.`);
  if (atCapacity()) return fail('Office is full — expand to hire more.');
  const cost = hireCost(deptId);
  if (state.money < cost) return fail('Not enough coins.');
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
  if (state.money < cost) return fail('Not enough coins.');
  state.money -= cost;
  d.tier++;
  bus.emit('deskUpgraded', { deptId, tier: d.tier });
  return done({ cost, tier: d.tier });
}

export function buyDecoration(id) {
  const cost = decoCost(id);
  if (state.money < cost) return fail('Not enough coins.');
  state.money -= cost;
  state.decorations[id]++;
  bus.emit('decoAdded', { id, index: state.decorations[id] - 1 });
  return done({ cost });
}

export function buyUpgrade(id) {
  const u = UPGRADES.find((x) => x.id === id);
  if (!u) return fail('Unknown upgrade.');
  if (companyLevel() < u.unlockLevel) return fail(`Unlocks at Level ${u.unlockLevel}.`);
  if (state.upgrades[id] >= u.max) return fail('Maxed out.');
  const cost = upgradeCost(id);
  if (state.money < cost) return fail('Not enough coins.');
  state.money -= cost;
  state.upgrades[id]++;
  bus.emit('upgradeBought', { id, level: state.upgrades[id] });
  return done({ cost, level: state.upgrades[id] });
}

export function buyStation(id) {
  const s = STATION_BY_ID[id];
  if (!s) return fail('Unknown station.');
  if (companyLevel() < s.unlockLevel) return fail(`Unlocks at Level ${s.unlockLevel}.`);
  const cost = stationCost(id);
  if (state.money < cost) return fail('Not enough coins.');
  state.money -= cost;
  state.stations[id] = (state.stations[id] || 0) + 1;
  bus.emit('stationBuilt', { id, count: state.stations[id] });
  return done({ cost, count: state.stations[id] });
}

export function expandOffice() {
  const next = state.officeLevel + 1;
  if (next >= OFFICE_LEVELS.length) return fail('Already the largest campus.');
  const cost = officeUpgradeCost();
  if (state.money < cost) return fail('Not enough coins.');
  state.money -= cost;
  state.officeLevel = next;
  bus.emit('officeExpanded', { level: next });
  return done({ cost, level: next });
}
