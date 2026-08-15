// ============================================================================
// Stat pipeline — pure function, unit-testable, no side effects.
//
// Resolution order (per tech doc):
//   base -> flat adds -> % adds (summed) -> % multipliers (multiplicative) -> caps/floors
// ============================================================================

import { STAT_KEYS, type StatBlock, type StatModifier } from './types';

/**
 * Compute final stats from a base stat block and a flat list of modifiers.
 * Pure function: does not mutate `base` or `modifiers`.
 */
export function computeStats(base: StatBlock, modifiers: StatModifier[]): StatBlock {
  const result = { ...base };

  for (const key of STAT_KEYS) {
    const statMods = modifiers.filter((m) => m.stat === key);
    let value = base[key];

    // 1. flat adds (summed)
    const flat = statMods.filter((m) => m.type === 'flat').reduce((sum, m) => sum + m.value, 0);
    value += flat;

    // 2. % adds (summed, then applied once)
    const percentAddSum = statMods
      .filter((m) => m.type === 'percentAdd')
      .reduce((sum, m) => sum + m.value, 0);
    value *= 1 + percentAddSum;

    // 3. % multipliers (multiplicative, applied one at a time)
    for (const m of statMods.filter((m) => m.type === 'percentMult')) {
      value *= 1 + m.value;
    }

    // 4. caps/floors
    for (const m of statMods.filter((m) => m.type === 'cap')) {
      value = Math.min(value, m.value);
    }
    for (const m of statMods.filter((m) => m.type === 'floor')) {
      value = Math.max(value, m.value);
    }

    result[key] = value;
  }

  return result;
}
