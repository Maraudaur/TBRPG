import type { EnemyDefinition } from '../sim/types';

export const FROST_WRAITH: EnemyDefinition = {
  kind: 'enemy',
  id: 'frost_wraith',
  name: 'Frost Wraith',
  element: 'ice',
  level: 5,
  baseStats: {
    maxHp: 150,
    maxAp: 20,
    atk: 10,
    def: 8,
    matk: 14,
    mdef: 8,
    speed: 9,
    critChance: 0.05,
    critDamage: 1.5,
    accuracy: 0.9,
    evasion: 0.05,
  },
  abilities: ['ice_shard'],
};

export const GOBLIN_BRUTE: EnemyDefinition = {
  kind: 'enemy',
  id: 'goblin_brute',
  name: 'Goblin Brute',
  element: 'physical',
  level: 5,
  baseStats: {
    maxHp: 100,
    maxAp: 10,
    atk: 14,
    def: 6,
    matk: 2,
    mdef: 4,
    speed: 7,
    critChance: 0.05,
    critDamage: 1.5,
    accuracy: 0.9,
    evasion: 0.02,
  },
  abilities: ['slash'],
};

export const ENEMIES: Record<string, EnemyDefinition> = {
  frost_wraith: FROST_WRAITH,
  goblin_brute: GOBLIN_BRUTE,
};
