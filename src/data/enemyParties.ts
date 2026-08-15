import type { EnemyParty } from '../sim/types';

export const DEFAULT_ENEMY_PARTY: EnemyParty = {
  id: 'default_enemy_party',
  name: 'Default Enemy Party',
  slots: [
    { slotIndex: 0, row: 'front', enemyId: 'frost_wraith' },
    { slotIndex: 1, row: 'front', enemyId: 'goblin_brute' },
    { slotIndex: 2, row: 'front', enemyId: null },
    { slotIndex: 3, row: 'back', enemyId: null },
    { slotIndex: 4, row: 'back', enemyId: null },
    { slotIndex: 5, row: 'back', enemyId: null },
  ],
};

export const ENEMY_PARTIES: Record<string, EnemyParty> = {
  default_enemy_party: DEFAULT_ENEMY_PARTY,
};
