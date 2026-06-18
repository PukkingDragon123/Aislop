// ============================================================================
//  The Meme Lab — fuse Hype to discover brainrot characters.
//  Mirrors sim/actions.js: validate cost → mutate state → emit events. The
//  collection multiplier itself is read live in economy.computeModifiers(), so
//  a discovery takes effect on the very next tick automatically.
// ============================================================================

import { state } from '../core/state.js';
import { ROSTER, RARITIES, ECON } from '../core/config.js';
import { bus } from '../core/events.js';

export function fusionCost() {
  return Math.floor(ECON.fusionBaseCost * Math.pow(ECON.fusionGrowth, state.fusionsDone));
}

export function discoveredCount() {
  let n = 0;
  for (const c of ROSTER) if (state.discovered[c.id]) n++;
  return n;
}

export function collectionMultiplier() {
  let m = 1;
  for (const c of ROSTER) if (state.discovered[c.id]) m *= 1 + RARITIES[c.rarity].collectMult;
  return m;
}

function weightedPick(pool) {
  let total = 0;
  for (const c of pool) total += RARITIES[c.rarity].weight;
  let r = Math.random() * total;
  for (const c of pool) { r -= RARITIES[c.rarity].weight; if (r <= 0) return c; }
  return pool[pool.length - 1];
}

/**
 * Perform one fusion. Biases toward undiscovered characters so the collection
 * fills at a satisfying pace; duplicates refund part of the cost.
 */
export function fuse() {
  const cost = fusionCost();
  if (state.hype < cost) return { ok: false, reason: 'Not enough Hype — publish more slop!' };

  state.hype -= cost;
  state.fusionsDone++;

  const undiscovered = ROSTER.filter((c) => !state.discovered[c.id]);
  const char = (undiscovered.length && Math.random() < ECON.undiscoveredBias)
    ? weightedPick(undiscovered)
    : weightedPick(ROSTER);

  const isNew = !state.discovered[char.id];
  let refund = 0;
  if (isNew) {
    state.discovered[char.id] = true;
    bus.emit('discovered', { id: char.id, char });
  } else {
    refund = Math.floor(cost * ECON.dupeRefund);
    state.hype += refund;
  }

  bus.emit('fused', { id: char.id, char, isNew, duplicate: !isNew, refund });
  bus.emit('purchase'); // lets the open Lab tab auto-refresh
  return { ok: true, char, isNew, refund };
}
