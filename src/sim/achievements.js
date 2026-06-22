// ============================================================================
//  Achievements — one-time goals that pay tokens/coins. Checked periodically;
//  unlocking one fires an 'achievement' event for the celebration.
// ============================================================================

import { ACHIEVEMENTS } from '../core/config.js';
import { state, totalWorkers } from '../core/state.js';
import { bus } from '../core/events.js';
import { collectionCount, companyLevel } from './economy.js';
import { maxLevel, ownsRarityAtLeast, RARITY_RANK } from './gacha.js';

function statValue(stat) {
  switch (stat) {
    case 'pulls': return state.pulls;
    case 'owned': return collectionCount();
    case 'maxlvl': return maxLevel();
    case 'epic': return ownsRarityAtLeast(RARITY_RANK.epic) ? 1 : 0;
    case 'mythic': return ownsRarityAtLeast(RARITY_RANK.mythic) ? 1 : 0;
    case 'gold': return ownsRarityAtLeast(RARITY_RANK.gold) ? 1 : 0;
    case 'diamond': return ownsRarityAtLeast(RARITY_RANK.diamond) ? 1 : 0;
    case 'coins': return state.money;
    case 'lifetime': return state.lifetimeMoney;
    case 'fans': return state.followers;
    case 'staff': return totalWorkers();
    case 'viral': return state.totalViral;
    case 'level': return companyLevel();
    case 'bullies': return state.bullies;
    case 'office': return state.officeLevel;
    default: return 0;
  }
}

export function achievementProgress(a) { return Math.min(statValue(a.stat), a.target); }
export function isUnlocked(a) { return !!state.achievements[a.id]; }
export function unlockedCount() { let n = 0; for (const a of ACHIEVEMENTS) if (state.achievements[a.id]) n++; return n; }

export function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && statValue(a.stat) >= a.target) {
      state.achievements[a.id] = true;
      if (a.reward.tokens) state.tokens += a.reward.tokens;
      if (a.reward.coins) state.money += a.reward.coins;
      bus.emit('achievement', { ach: a });
    }
  }
}

export { ACHIEVEMENTS };
