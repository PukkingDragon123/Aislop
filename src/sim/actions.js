// ============================================================================
//  Build actions — the only sanctioned way to grow the office/zoo. Each returns
//  { ok, reason } and emits an event the 3D world reacts to.
// ============================================================================

import { state, hireCost, deskUpgradeCost, decoCost, officeUpgradeCost, atCapacity } from '../core/state.js';
import { DESK_TIERS, OFFICE_LEVELS } from '../core/config.js';
import { bus } from '../core/events.js';

function fail(reason) { return { ok: false, reason }; }
function done(extra) { bus.emit('purchase'); return { ok: true, ...extra }; }

export function hire(deptId) {
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
