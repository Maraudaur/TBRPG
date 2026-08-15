// ============================================================================
// Core data-shape type definitions for the battle simulator.
// Pure types only — no logic here (per tech-doc build order step 1).
// ============================================================================

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type Element =
  | 'physical'
  | 'fire'
  | 'ice'
  | 'lightning'
  | 'holy'
  | 'dark'
  | 'neutral';

export type Row = 'front' | 'back';

export type GearSlot = 'weapon' | 'armor' | 'accessory';

export type AbilityTargetType =
  | 'singleEnemy'
  | 'singleAlly'
  | 'allEnemies'
  | 'allAllies'
  | 'self';

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface StatBlock {
  maxHp: number;
  maxAp: number;
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  speed: number;
  /** 0..1 chance to land a critical hit */
  critChance: number;
  /** multiplier applied on crit, e.g. 1.5 = +50% damage */
  critDamage: number;
  /** 0..1 chance to hit */
  accuracy: number;
  /** 0..1 chance to evade an incoming hit */
  evasion: number;
}

export const STAT_KEYS: (keyof StatBlock)[] = [
  'maxHp',
  'maxAp',
  'atk',
  'def',
  'matk',
  'mdef',
  'speed',
  'critChance',
  'critDamage',
  'accuracy',
  'evasion',
];

export type ModifierType = 'flat' | 'percentAdd' | 'percentMult' | 'cap' | 'floor';

export interface StatModifier {
  stat: keyof StatBlock;
  type: ModifierType;
  value: number;
  /** free-text provenance for debugging/log purposes, e.g. "Ashborn Ring" */
  source?: string;
  /** if set, the modifier is temporary and expires after N of the owner's turns */
  duration?: number;
  /** battle-instance unit id of whoever granted this modifier (e.g. an aura passive's holder). Used to strip the
   * modifier from its recipients when that unit dies — a "while I'm alive" aura, distinct from `duration`-based
   * expiry. Not set for gear (gear modifiers live and die with their own wearer, not a separate granter). */
  sourceUnitId?: string;
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

export type TriggerType =
  | 'OnBattleStart'
  | 'OnTurnStart'
  | 'OnAbilityCast'
  | 'OnDamageDealt'
  | 'OnDamageTaken'
  | 'OnStatusApplied'
  | 'OnStatusExpired'
  | 'OnHPThresholdCrossed'
  | 'OnDeath'
  | 'OnRowChanged';

/**
 * Payload for a single emitted trigger event. Fields are optional because
 * different trigger types populate different subsets. Unit references are
 * plain instance ids (strings) to keep this file free of runtime/circular
 * dependencies on the battle state.
 */
export interface TriggerEvent {
  type: TriggerType;
  /** the unit that caused this event (attacker, caster, status source, ...) */
  source?: string;
  /** the primary unit this event happened to (defender, status holder, ...) */
  target?: string;
  ability?: string;
  element?: Element;
  damage?: number;
  amount?: number;
  status?: string;
  stacks?: number;
  stat?: keyof StatBlock;
  threshold?: number;
  /** true if the damage that caused this event was a critical hit (DealDamage-originated events only) */
  isCrit?: boolean;
  /**
   * Scratch variables carried through the resolution of this single event,
   * e.g. `stacksConsumed` set by a ConsumeStatus effect so a later
   * DealDamage effect's formula in the SAME binding can reference it.
   */
  vars?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

export type ConditionSubject = 'self' | 'target' | 'source';

export type CompareOp = '<' | '<=' | '>' | '>=' | '==' | '!=';

export type StatCompareStat = keyof StatBlock | 'currentHp' | 'hpPercent' | 'currentAp';

export type Condition =
  /** true iff the owner of this binding IS the source/actor of the event */
  | { type: 'self' }
  /** true iff the unit at `target` is on the owner's team and is NOT the owner — the "an ally, not me" scope */
  | { type: 'teammate'; target: ConditionSubject }
  | { type: 'statCompare'; target: ConditionSubject; stat: StatCompareStat; op: CompareOp; value: number }
  | { type: 'hasStatus'; target: ConditionSubject; status: string; min?: number; max?: number }
  | { type: 'element'; value: Element }
  | { type: 'row'; target: ConditionSubject; row: Row }
  | { type: 'chance'; probability: number }
  /** true iff the triggering event's `isCrit` flag is set (DealDamage-originated events only) */
  | { type: 'wasCrit' }
  /** true iff the triggering event's `ability` id matches (OnAbilityCast, and any event carrying an ability id) */
  | { type: 'abilityIs'; value: string }
  | { type: 'allOf'; conditions: Condition[] }
  | { type: 'anyOf'; conditions: Condition[] }
  | { type: 'not'; condition: Condition };

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

export type EffectTarget = 'self' | 'target' | 'source' | 'allEnemies' | 'allAllies';

export type Effect =
  | { type: 'DealDamage'; target: EffectTarget; formula: string; element: Element }
  | { type: 'ApplyStatus'; target: EffectTarget; status: string; stacks?: number; duration?: number }
  | { type: 'ConsumeStatus'; target: EffectTarget; status: string; count: number | 'all' }
  | { type: 'ModifyStat'; target: EffectTarget; stat: keyof StatBlock; modType: ModifierType; value: number; duration?: number }
  | { type: 'Heal'; target: EffectTarget; formula: string }
  | { type: 'GrantExtraTurn'; target: EffectTarget }
  | { type: 'ModifyAP'; target: EffectTarget; amount: number }
  /** moves target's row. Omit `row` to toggle to the opposite of its current row, or force a specific row. */
  | { type: 'SwitchRow'; target: EffectTarget; row?: Row };

// ---------------------------------------------------------------------------
// Binding — the unified shape shared by abilities, passives, and gear affixes
// ---------------------------------------------------------------------------

export interface Binding {
  id?: string;
  name?: string;
  trigger: TriggerType;
  /** AND'd list; nest AllOf/AnyOf/Not inside for OR / negation logic */
  conditions: Condition[];
  /** executed in order if all conditions pass */
  effects: Effect[];
  /** higher resolves first when multiple bindings fire on the same event */
  priority?: number;
}

// ---------------------------------------------------------------------------
// Status effects
// ---------------------------------------------------------------------------

export interface StatusEffectDef {
  id: string;
  name: string;
  description?: string;
  stackable: boolean;
  maxStacks?: number;
  /** turns a fresh application lasts, if not overridden by the applying effect */
  defaultDuration?: number;
  /** e.g. burn ticking damage on OnTurnStart */
  bindings?: Binding[];
}

// ---------------------------------------------------------------------------
// Abilities
// ---------------------------------------------------------------------------

export interface Ability {
  id: string;
  name: string;
  description?: string;
  apCost: number;
  targetType: AbilityTargetType;
  element: Element;
  levelRequirement?: number;
  /** at minimum should include a binding with trigger 'OnAbilityCast' */
  bindings: Binding[];
}

// ---------------------------------------------------------------------------
// Passives — standalone, reusable binding bundles authored once and then
// attached to any number of characters/enemies by id (same relationship
// abilities already have: define once, reference by id from a unit).
// ---------------------------------------------------------------------------

export interface PassiveDef {
  id: string;
  name: string;
  description?: string;
  bindings: Binding[];
}

// ---------------------------------------------------------------------------
// Gear
// ---------------------------------------------------------------------------

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  statModifiers: StatModifier[];
  bindings?: Binding[];
}

// ---------------------------------------------------------------------------
// Level system
// ---------------------------------------------------------------------------

export interface LevelCurveEntry {
  level: number;
  /** xp required to advance FROM this level to the next */
  xpToNext: number;
  /** stat increases granted upon reaching this level */
  statGrowth: Partial<StatBlock>;
  /** ability ids unlocked upon reaching this level */
  unlocks?: string[];
}

// ---------------------------------------------------------------------------
// Characters / Enemies
// ---------------------------------------------------------------------------

interface UnitDefinitionBase {
  id: string;
  name: string;
  baseStats: StatBlock;
  element: Element;
  abilities: string[];
  gear?: Partial<Record<GearSlot, string>>;
  /** ids of standalone PassiveDefs attached to this unit */
  passives?: string[];
  /** @deprecated inline passive bindings from before passives were a standalone, reusable entity — still read (not editable) for backward compatibility with old saved data */
  passiveBindings?: Binding[];
}

export interface CharacterDefinition extends UnitDefinitionBase {
  kind: 'character';
  level: number;
  xp?: number;
  archetype?: string;
}

export interface EnemyDefinition extends UnitDefinitionBase {
  kind: 'enemy';
  level?: number;
}

export type UnitDefinition = CharacterDefinition | EnemyDefinition;

// ---------------------------------------------------------------------------
// Party
// ---------------------------------------------------------------------------

export interface PartySlot {
  slotIndex: number; // 0..5
  row: Row;
  characterId: string | null;
}

export interface Party {
  id: string;
  name: string;
  slots: PartySlot[]; // length 6
}

// ---------------------------------------------------------------------------
// Enemy party — same shape/relationship as Party, but composed of
// EnemyDefinitions instead of CharacterDefinitions, so a whole encounter can
// be saved and picked as a single unit in Test Combat.
// ---------------------------------------------------------------------------

export interface EnemyPartySlot {
  slotIndex: number; // 0..5
  row: Row;
  enemyId: string | null;
}

export interface EnemyParty {
  id: string;
  name: string;
  slots: EnemyPartySlot[]; // length 6
}
