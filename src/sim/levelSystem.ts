// ============================================================================
// Level system — deliberately the least novel piece (per tech doc).
// Fixed XP curve + per-level stat growth + ability unlocks by level.
// ============================================================================

import type { LevelCurveEntry, StatBlock } from './types';
import { STAT_KEYS } from './types';

// 99 gives real headroom for endgame power-curve testing — at the old cap of
// 20, requesting level 40+ for a scaling test silently plateaued at the
// level-20 growth total since the curve had nothing past that to sum.
export const MAX_LEVEL = 99;

/** A simple fixed curve: flat stat growth per level, gentle xp curve. */
export function buildDefaultLevelCurve(): LevelCurveEntry[] {
  const curve: LevelCurveEntry[] = [];
  for (let level = 2; level <= MAX_LEVEL; level++) {
    curve.push({
      level,
      xpToNext: Math.round(100 * Math.pow(level, 1.5)),
      statGrowth: {
        maxHp: 12,
        maxAp: 2,
        atk: 2,
        def: 1,
        matk: 2,
        mdef: 1,
        speed: 1,
      },
      unlocks: [],
    });
  }
  return curve;
}

/** Sum stat growth for every curve entry at or below `level` and add it to base. */
export function applyLevelGrowth(base: StatBlock, level: number, curve: LevelCurveEntry[]): StatBlock {
  const result = { ...base };
  for (const entry of curve) {
    if (entry.level > level) continue;
    for (const key of STAT_KEYS) {
      const growth = entry.statGrowth[key];
      if (growth) result[key] += growth;
    }
  }
  return result;
}

/** Ability ids unlocked at or below `level`. */
export function unlockedAbilities(level: number, curve: LevelCurveEntry[]): string[] {
  const ids: string[] = [];
  for (const entry of curve) {
    if (entry.level <= level && entry.unlocks) ids.push(...entry.unlocks);
  }
  return ids;
}

export function totalXpForLevel(level: number, curve: LevelCurveEntry[]): number {
  let total = 0;
  for (const entry of curve) {
    if (entry.level <= level) total += entry.xpToNext;
  }
  return total;
}

export function levelForXp(xp: number, curve: LevelCurveEntry[]): number {
  let level = 1;
  let remaining = xp;
  for (const entry of curve) {
    if (remaining < entry.xpToNext) break;
    remaining -= entry.xpToNext;
    level = entry.level;
  }
  return level;
}
