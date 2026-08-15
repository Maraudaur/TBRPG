import { describe, expect, it } from 'vitest';
import { computeStats } from './statPipeline';
import type { StatBlock, StatModifier } from './types';

const BASE: StatBlock = {
  maxHp: 100,
  maxAp: 20,
  atk: 10,
  def: 10,
  matk: 10,
  mdef: 10,
  speed: 10,
  critChance: 0.05,
  critDamage: 1.5,
  accuracy: 0.9,
  evasion: 0.05,
};

describe('computeStats', () => {
  it('returns base stats unchanged with no modifiers', () => {
    const result = computeStats(BASE, []);
    expect(result).toEqual(BASE);
  });

  it('applies flat adds before percent adds', () => {
    const mods: StatModifier[] = [
      { stat: 'atk', type: 'flat', value: 10 }, // 10 -> 20
      { stat: 'atk', type: 'percentAdd', value: 0.5 }, // 20 * 1.5 = 30
    ];
    const result = computeStats(BASE, mods);
    expect(result.atk).toBe(30);
  });

  it('sums multiple percent-add modifiers instead of compounding them', () => {
    const mods: StatModifier[] = [
      { stat: 'atk', type: 'percentAdd', value: 0.2 },
      { stat: 'atk', type: 'percentAdd', value: 0.3 },
    ];
    // 10 * (1 + 0.2 + 0.3) = 15, NOT 10 * 1.2 * 1.3 = 15.6
    const result = computeStats(BASE, mods);
    expect(result.atk).toBe(15);
  });

  it('applies percent multipliers multiplicatively, after percent adds', () => {
    const mods: StatModifier[] = [
      { stat: 'atk', type: 'percentAdd', value: 0.5 }, // 10 -> 15
      { stat: 'atk', type: 'percentMult', value: 1.0 }, // 15 * 2 = 30
      { stat: 'atk', type: 'percentMult', value: -0.5 }, // 30 * 0.5 = 15
    ];
    const result = computeStats(BASE, mods);
    expect(result.atk).toBe(15);
  });

  it('applies caps and floors last, after all other modifiers', () => {
    const mods: StatModifier[] = [
      { stat: 'atk', type: 'flat', value: 1000 },
      { stat: 'atk', type: 'cap', value: 50 },
    ];
    const result = computeStats(BASE, mods);
    expect(result.atk).toBe(50);
  });

  it('applies a floor to prevent a stat from going negative', () => {
    const mods: StatModifier[] = [
      { stat: 'def', type: 'flat', value: -1000 },
      { stat: 'def', type: 'floor', value: 0 },
    ];
    const result = computeStats(BASE, mods);
    expect(result.def).toBe(0);
  });

  it('runs the full pipeline in the documented order: base -> flat -> %add -> %mult -> cap/floor', () => {
    const mods: StatModifier[] = [
      { stat: 'matk', type: 'flat', value: 20 }, // 10 -> 30
      { stat: 'matk', type: 'percentAdd', value: 0.5 }, // 30 -> 45
      { stat: 'matk', type: 'percentAdd', value: 0.5 }, // summed with above: 30 * 2 = 60
      { stat: 'matk', type: 'percentMult', value: 0.1 }, // 60 -> 66
      { stat: 'matk', type: 'cap', value: 65 }, // clamp down to 65
    ];
    const result = computeStats(BASE, mods);
    expect(result.matk).toBe(65);
  });

  it('does not mutate the input base stats or modifiers', () => {
    const mods: StatModifier[] = [{ stat: 'atk', type: 'flat', value: 5 }];
    const baseCopy = { ...BASE };
    const modsCopy = mods.map((m) => ({ ...m }));
    computeStats(BASE, mods);
    expect(BASE).toEqual(baseCopy);
    expect(mods).toEqual(modsCopy);
  });

  it('only affects the targeted stat, leaving others untouched', () => {
    const mods: StatModifier[] = [{ stat: 'speed', type: 'flat', value: 100 }];
    const result = computeStats(BASE, mods);
    expect(result.speed).toBe(110);
    expect(result.atk).toBe(BASE.atk);
    expect(result.def).toBe(BASE.def);
  });
});
