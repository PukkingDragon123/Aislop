// ============================================================================
//  Quests — the source of tokens 🎟️. A sequential chain; completing the current
//  quest awards tokens (and sometimes coins) and advances to the next.
// ============================================================================

import { QUESTS } from '../core/config.js';
import { state, totalWorkers } from '../core/state.js';
import { bus } from '../core/events.js';
import { incomePerSec } from './economy.js';
import { ownedCount, maxLevel, ownsRarityAtLeast, RARITY_RANK } from './gacha.js';

function statValue(stat) {
  switch (stat) {
    case 'pulls': return state.pulls;
    case 'owned': return ownedCount();
    case 'staff': return totalWorkers();
    case 'maxlvl': return maxLevel();
    case 'income': return incomePerSec();
    case 'spikes': return state.spikes;
    case 'epic': return ownsRarityAtLeast(RARITY_RANK.epic) ? 1 : 0;
    case 'fans': return state.followers;
    default: return 0;
  }
}

export function currentQuest() {
  if (state.questStep >= QUESTS.length) return null;
  const q = QUESTS[state.questStep];
  return { def: q, cur: Math.min(statValue(q.stat), q.target), target: q.target };
}

export function checkQuests() {
  let guard = 0;
  while (state.questStep < QUESTS.length && guard++ < 50) {
    const q = QUESTS[state.questStep];
    if (statValue(q.stat) >= q.target) {
      if (q.reward.tokens) state.tokens += q.reward.tokens;
      if (q.reward.coins) state.money += q.reward.coins;
      state.questStep++;
      bus.emit('questComplete', { quest: q, reward: q.reward });
    } else break;
  }
}

export { QUESTS };
