import type {
  CompareOp,
  ConditionSubject,
  Element,
  GearSlot,
  ModifierType,
  Row,
  StatCompareStat,
  TriggerType,
} from '../../sim/types';
import { STAT_KEYS } from '../../sim/types';

export const ELEMENTS: Element[] = ['physical', 'fire', 'ice', 'lightning', 'holy', 'dark', 'neutral'];
export const ROWS: Row[] = ['front', 'back'];
export const GEAR_SLOTS: GearSlot[] = ['weapon', 'armor', 'accessory'];
export const TRIGGER_TYPES: TriggerType[] = [
  'OnBattleStart',
  'OnTurnStart',
  'OnAbilityCast',
  'OnDamageDealt',
  'OnDamageTaken',
  'OnStatusApplied',
  'OnStatusExpired',
  'OnHPThresholdCrossed',
  'OnDeath',
  'OnRowChanged',
];
export const CONDITION_TYPES = [
  'self',
  'teammate',
  'statCompare',
  'hasStatus',
  'element',
  'row',
  'chance',
  'wasCrit',
  'abilityIs',
  'allOf',
  'anyOf',
  'not',
] as const;
export const EFFECT_TYPES = [
  'DealDamage',
  'ApplyStatus',
  'ConsumeStatus',
  'ModifyStat',
  'Heal',
  'GrantExtraTurn',
  'ModifyAP',
  'SwitchRow',
] as const;
export const CONDITION_SUBJECTS: ConditionSubject[] = ['self', 'target', 'source'];
export const EFFECT_TARGETS = ['self', 'target', 'source', 'allEnemies', 'allAllies'] as const;
export const COMPARE_OPS: CompareOp[] = ['<', '<=', '>', '>=', '==', '!='];
export const MODIFIER_TYPES: ModifierType[] = ['flat', 'percentAdd', 'percentMult', 'cap', 'floor'];
export const STAT_COMPARE_STATS: StatCompareStat[] = [...STAT_KEYS, 'currentHp', 'hpPercent', 'currentAp'];
export const TARGET_TYPES = ['singleEnemy', 'singleAlly', 'allEnemies', 'allAllies', 'self'] as const;

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
