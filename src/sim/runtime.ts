// ============================================================================
// Runtime (in-battle) state types. Separate from types.ts so the pure data
// layer stays free of simulation-only concerns (instance ids, live HP, etc).
// ============================================================================

import type { Ability, Binding, Row, StatBlock, StatModifier, StatusEffectDef, TriggerType } from './types';

export type Team = 'player' | 'enemy';

export interface StatusInstance {
  statusId: string;
  stacks: number;
  /** turns remaining; Infinity for a status with no expiry */
  duration: number;
}

export interface BattleUnit {
  /** unique instance id within this battle (distinct from the definition id) */
  id: string;
  defId: string;
  name: string;
  team: Team;
  row: Row;
  level: number;
  /** stats after level growth, before gear/status modifiers */
  baseStats: StatBlock;
  /** modifiers from gear + temporary ModifyStat effects (buffs/debuffs) */
  statModifiers: StatModifier[];
  /** computed via computeStats(); recalculated whenever statModifiers change */
  currentStats: StatBlock;
  currentHp: number;
  currentAp: number;
  statuses: StatusInstance[];
  /** aggregated reactive bindings from gear + innate passives (NOT ability-cast bindings) */
  bindings: Binding[];
  abilities: Ability[];
  alive: boolean;
  /** CTB scheduling value — lower means acts sooner */
  nextAvailable: number;
  /** HP% thresholds already crossed, so OnHPThresholdCrossed doesn't refire every hit */
  crossedThresholds: Set<number>;
}

export interface LogEntry {
  turn: number;
  message: string;
  eventType?: TriggerType;
  data?: Record<string, unknown>;
}

export interface BattleState {
  units: BattleUnit[];
  turn: number;
  log: LogEntry[];
  rng: () => number;
  statusDefs: Record<string, StatusEffectDef>;
  maxTurns: number;
}

export function getUnit(battle: BattleState, id: string | undefined): BattleUnit | undefined {
  if (!id) return undefined;
  return battle.units.find((u) => u.id === id);
}

export function log(battle: BattleState, message: string, eventType?: TriggerType, data?: Record<string, unknown>): void {
  battle.log.push({ turn: battle.turn, message, eventType, data });
}
