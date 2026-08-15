// ============================================================================
// Headless battle loop — hardcoded/authored party vs enemy, runs to a
// winner, produces a verbose log of every trigger/condition/effect fired.
// Zero React dependency; usable from tests, scripts, or the UI layer.
// ============================================================================

import { computeStats } from './statPipeline';
import { applyLevelGrowth, buildDefaultLevelCurve } from './levelSystem';
import { EventBus } from './eventBus';
import { attachResolver, evaluateCondition, executeEffect, recomputeStats } from './resolver';
import type { BattleState, BattleUnit, LogEntry, Team } from './runtime';
import { log } from './runtime';
import type {
  Ability,
  GearItem,
  LevelCurveEntry,
  PassiveDef,
  Row,
  StatModifier,
  StatusEffectDef,
  TriggerEvent,
  UnitDefinition,
} from './types';

const BASE_DELAY = 1000;

export const BASIC_ATTACK: Ability = {
  id: 'basic_attack',
  name: 'Attack',
  description: 'A basic physical strike. Always available regardless of AP.',
  apCost: 0,
  targetType: 'singleEnemy',
  element: 'physical',
  bindings: [
    {
      id: 'basic_attack_binding',
      trigger: 'OnAbilityCast',
      conditions: [],
      effects: [{ type: 'DealDamage', target: 'target', formula: 'atk', element: 'physical' }],
    },
  ],
};

export interface BattleParticipant {
  def: UnitDefinition;
  row: Row;
  /** Overrides the unit's own saved level for this battle only — doesn't
   * touch the stored character/enemy definition. Used to re-run an existing
   * roster at an arbitrary level (e.g. testing an endgame power curve)
   * without hand-editing every participant first. */
  levelOverride?: number;
}

export interface BattleSetup {
  player: BattleParticipant[];
  enemies: BattleParticipant[];
  gearLookup?: Record<string, GearItem>;
  abilityLookup?: Record<string, Ability>;
  passiveLookup?: Record<string, PassiveDef>;
  statusDefs?: Record<string, StatusEffectDef>;
  levelCurve?: LevelCurveEntry[];
  rng?: () => number;
  maxTurns?: number;
}

export interface BattleResult {
  winner: Team | 'draw';
  log: LogEntry[];
  turns: number;
  units: BattleUnit[];
}

function buildUnit(
  participant: BattleParticipant,
  team: Team,
  index: number,
  gearLookup: Record<string, GearItem>,
  abilityLookup: Record<string, Ability>,
  passiveLookup: Record<string, PassiveDef>,
  levelCurve: LevelCurveEntry[],
): BattleUnit {
  const def = participant.def;
  // Level growth applies uniformly to both characters and enemies now — it
  // used to only apply to characters, silently leaving an enemy's level
  // field with no effect on its stats at all.
  const ownLevel = def.kind === 'character' ? def.level : (def.level ?? 1);
  const level = participant.levelOverride ?? ownLevel;
  const grownStats = applyLevelGrowth(def.baseStats, level, levelCurve);

  const gearMods: StatModifier[] = [];
  const gearBindings = [];
  if (def.gear) {
    for (const gearId of Object.values(def.gear)) {
      if (!gearId) continue;
      const item = gearLookup[gearId];
      if (!item) continue;
      gearMods.push(...item.statModifiers);
      if (item.bindings) gearBindings.push(...item.bindings);
    }
  }

  const passiveBindings = (def.passives ?? []).flatMap((id) => passiveLookup[id]?.bindings ?? []);

  const currentStats = computeStats(grownStats, gearMods);
  const abilities = def.abilities.map((id) => abilityLookup[id]).filter((a): a is Ability => Boolean(a));

  return {
    id: `${team}-${index}-${def.id}`,
    defId: def.id,
    name: def.name,
    team,
    row: participant.row,
    level,
    baseStats: grownStats,
    statModifiers: gearMods,
    currentStats,
    currentHp: currentStats.maxHp,
    currentAp: currentStats.maxAp,
    statuses: [],
    // def.passiveBindings is deprecated inline authoring, kept only so old
    // saved characters/enemies don't silently lose their passives.
    bindings: [...gearBindings, ...passiveBindings, ...(def.passiveBindings ?? [])],
    abilities,
    alive: true,
    nextAvailable: 0,
    crossedThresholds: new Set(),
  };
}

export function createBattleState(setup: BattleSetup): { battle: BattleState; bus: EventBus } {
  const gearLookup = setup.gearLookup ?? {};
  const abilityLookup = setup.abilityLookup ?? {};
  const passiveLookup = setup.passiveLookup ?? {};
  const statusDefs = setup.statusDefs ?? {};
  const levelCurve = setup.levelCurve ?? buildDefaultLevelCurve();

  const units: BattleUnit[] = [
    ...setup.player.map((p, i) => buildUnit(p, 'player', i, gearLookup, abilityLookup, passiveLookup, levelCurve)),
    ...setup.enemies.map((e, i) => buildUnit(e, 'enemy', i, gearLookup, abilityLookup, passiveLookup, levelCurve)),
  ];

  // Back row can't act or be targeted, so a team fielded with nobody in
  // front would be unwinnable/unable to fight back. Silently promote one
  // back-row unit to front at formation time so that can't happen — this is
  // formation setup, not a combat event, so it's not logged.
  for (const team of ['player', 'enemy'] as const) {
    const hasFront = units.some((u) => u.team === team && u.row === 'front');
    if (hasFront) continue;
    const promote = units.find((u) => u.team === team && u.row === 'back');
    if (promote) promote.row = 'front';
  }

  const battle: BattleState = {
    units,
    turn: 0,
    log: [],
    rng: setup.rng ?? Math.random,
    statusDefs,
    maxTurns: setup.maxTurns ?? 200,
  };

  const bus = new EventBus();
  attachResolver(battle, bus);
  return { battle, bus };
}

function tickDurations(unit: BattleUnit, battle: BattleState, bus: EventBus): void {
  let modsChanged = false;
  unit.statModifiers = unit.statModifiers.filter((m) => {
    if (m.duration === undefined) return true;
    m.duration -= 1;
    if (m.duration <= 0) {
      modsChanged = true;
      return false;
    }
    return true;
  });
  if (modsChanged) recomputeStats(unit);

  const expired: string[] = [];
  unit.statuses = unit.statuses.filter((s) => {
    s.duration -= 1;
    if (s.duration <= 0) {
      expired.push(s.statusId);
      return false;
    }
    return true;
  });
  for (const statusId of expired) {
    log(battle, `${unit.name}'s ${statusId} expires`, 'OnStatusExpired', { target: unit.id, status: statusId });
    bus.emit({ type: 'OnStatusExpired', target: unit.id, status: statusId });
  }
}

function pickNextUnit(battle: BattleState): BattleUnit | undefined {
  const alive = battle.units.filter((u) => u.alive);
  if (alive.length === 0) return undefined;
  return alive.reduce((best, u) => {
    if (u.nextAvailable < best.nextAvailable) return u;
    if (u.nextAvailable === best.nextAvailable && u.currentStats.speed > best.currentStats.speed) return u;
    return best;
  }, alive[0]);
}

function chooseAbility(unit: BattleUnit): Ability {
  const affordable = unit.abilities.find((a) => a.apCost <= unit.currentAp);
  return affordable ?? BASIC_ATTACK;
}

function chooseTarget(unit: BattleUnit, ability: Ability, battle: BattleState): string | undefined {
  const opposingTeam = unit.team === 'player' ? 'enemy' : 'player';
  if (ability.targetType === 'singleAlly' || ability.targetType === 'allAllies' || ability.targetType === 'self') {
    const allies = battle.units.filter((u) => u.alive && u.team === unit.team);
    if (allies.length === 0) return undefined;
    const lowestHp = allies.reduce((lowest, u) => {
      const lp = lowest.currentHp / lowest.currentStats.maxHp;
      const up = u.currentHp / u.currentStats.maxHp;
      return up < lp ? u : lowest;
    }, allies[0]);
    return lowestHp.id;
  }
  // singleEnemy / allEnemies: the back row can't be targeted directly.
  // No fallback to back row here — the row-swap-on-death mechanic (see
  // resolver.ts's promoteBackRowIfNeeded) plus the formation-time front-row
  // backfill above guarantee the front row is populated as long as the
  // opposing team has anyone alive.
  const opposing = battle.units.filter((u) => u.alive && u.team === opposingTeam && u.row === 'front');
  if (opposing.length === 0) return undefined;
  return opposing[0].id;
}

function castAbility(caster: BattleUnit, ability: Ability, targetId: string | undefined, battle: BattleState, bus: EventBus): void {
  caster.currentAp = Math.max(0, caster.currentAp - ability.apCost);
  const targetUnit = targetId ? battle.units.find((u) => u.id === targetId) : undefined;
  log(
    battle,
    `${caster.name} casts ${ability.name}${targetUnit ? ` targeting ${targetUnit.name}` : ''}`,
    'OnAbilityCast',
    // apCostPaid lets the combat screen's replay animation deduct the
    // caster's own AP spend (separate from `target`, which here is the
    // ability's target, not necessarily who paid AP).
    { source: caster.id, target: targetId, ability: ability.id, apCostPaid: ability.apCost },
  );

  const event: TriggerEvent = {
    type: 'OnAbilityCast',
    source: caster.id,
    target: targetId,
    ability: ability.id,
    element: ability.element,
  };

  // Execute the ability's OWN cast bindings directly. This is intentionally
  // NOT routed through the generic gather-by-trigger-type resolver path, so
  // casting Fireball can never accidentally fire Heal's OnAbilityCast binding.
  for (const binding of ability.bindings.filter((b) => b.trigger === 'OnAbilityCast')) {
    const passes = binding.conditions.every((c) => evaluateCondition(c, caster.id, event, battle));
    if (!passes) continue;
    const vars: Record<string, number> = {};
    const bindingLabel = binding.name ?? ability.name;
    for (const effect of binding.effects) {
      executeEffect(effect, { ownerId: caster.id, event, battle, bus, vars, bindingLabel });
    }
  }

  // Notify reactive gear/passive listeners that a cast happened (e.g. "on
  // casting a fire ability, gain AP"). These come from the generic pool,
  // never from other abilities' own bindings.
  bus.emit(event);
}

function determineWinner(battle: BattleState): Team | 'draw' | undefined {
  const playerAlive = battle.units.some((u) => u.team === 'player' && u.alive);
  const enemyAlive = battle.units.some((u) => u.team === 'enemy' && u.alive);
  if (!playerAlive && !enemyAlive) return 'draw';
  if (!playerAlive) return 'enemy';
  if (!enemyAlive) return 'player';
  return undefined;
}

// ============================================================================
// Interactive (step-by-step) battle API — same engine as runBattle() above,
// but pauses on the player team's turns instead of auto-choosing for them.
// Used by the Test Combat screen so the user can pick moves themselves;
// enemy turns still resolve automatically via the existing AI helpers.
// ============================================================================

/** One "turn slot" worth of pre-action setup: advances the CTB queue to the
 * next living unit, logs the turn header, ticks durations, and re-checks for
 * a winner. Shared by both the headless loop and the interactive stepper. */
function beginTurn(battle: BattleState, bus: EventBus): { unit: BattleUnit } | { winner: Team | 'draw' } {
  const preWinner = determineWinner(battle);
  if (preWinner !== undefined) return { winner: preWinner };
  if (battle.turn >= battle.maxTurns) return { winner: 'draw' };

  const unit = pickNextUnit(battle);
  if (!unit) return { winner: 'draw' };

  battle.turn += 1;
  unit.nextAvailable += BASE_DELAY / Math.max(1, unit.currentStats.speed);

  log(battle, `--- Turn ${battle.turn}: ${unit.name} (${unit.team}) ---`, 'OnTurnStart', { source: unit.id });
  bus.emit({ type: 'OnTurnStart', source: unit.id, target: unit.id });

  if (unit.alive) tickDurations(unit, battle, bus);

  const postWinner = determineWinner(battle);
  if (postWinner !== undefined) return { winner: postWinner };
  return { unit };
}

/** Resolves one unit's action (AI-chosen if ability/targetId are omitted,
 * player-chosen otherwise) and returns the resulting winner, if any.
 * Units in the back row can't take actions at all — their turn is skipped
 * outright (any passed-in ability/target is ignored). This doesn't affect
 * reactive passive/gear/status bindings, which fire off the event bus
 * regardless of row and are untouched by this. */
function performAction(
  battle: BattleState,
  bus: EventBus,
  unit: BattleUnit,
  ability?: Ability,
  targetId?: string,
): Team | 'draw' | undefined {
  if (unit.alive) {
    if (unit.row === 'back') {
      log(battle, `${unit.name} is in the back row and cannot act this turn.`, undefined, { source: unit.id });
    } else {
      const chosenAbility = ability ?? chooseAbility(unit);
      const chosenTarget = targetId !== undefined ? targetId : chooseTarget(unit, chosenAbility, battle);
      castAbility(unit, chosenAbility, chosenTarget, battle, bus);
    }
  }
  return determineWinner(battle);
}

export type StepOutcome =
  | { status: 'awaitingPlayer'; unit: BattleUnit }
  | { status: 'finished'; winner: Team | 'draw' };

function finish(battle: BattleState, winner: Team | 'draw'): StepOutcome {
  log(battle, `--- Battle end: ${winner} wins (${battle.turn} turns) ---`);
  return { status: 'finished', winner };
}

/** Advances the battle automatically (AI vs AI, plus auto-skipping any
 * back-row turn) until it's a front-row player-team unit's turn to act, or
 * the battle ends. A player-team unit in the back row never pauses for
 * input — it can't act, so its turn resolves (as a no-op) automatically. */
export function stepUntilPlayerInputOrEnd(battle: BattleState, bus: EventBus): StepOutcome {
  while (true) {
    const step = beginTurn(battle, bus);
    if ('winner' in step) return finish(battle, step.winner);
    const unit = step.unit;
    if (unit.team === 'player' && unit.row === 'front') return { status: 'awaitingPlayer', unit };
    const winner = performAction(battle, bus, unit);
    if (winner !== undefined) return finish(battle, winner);
  }
}

/** Applies the player's chosen ability/target for the unit currently
 * awaiting input, then auto-resolves subsequent turns until it's the
 * player's turn again or the battle ends. */
export function resolvePlayerTurn(
  battle: BattleState,
  bus: EventBus,
  unit: BattleUnit,
  ability: Ability,
  targetId: string | undefined,
): StepOutcome {
  const winner = performAction(battle, bus, unit, ability, targetId);
  if (winner !== undefined) return finish(battle, winner);
  return stepUntilPlayerInputOrEnd(battle, bus);
}

/** Creates a fresh battle and runs it up to the first point the player needs
 * to act (or immediately to a finish, in the degenerate case of an empty
 * side). Mirrors runBattle()'s setup exactly, just without auto-playing the
 * player's turns. */
export function beginInteractiveBattle(setup: BattleSetup): { battle: BattleState; bus: EventBus; outcome: StepOutcome } {
  const { battle, bus } = createBattleState(setup);

  log(battle, '--- Battle start ---', 'OnBattleStart');
  bus.emit({ type: 'OnBattleStart' });

  const preWinner = determineWinner(battle);
  const outcome = preWinner !== undefined ? finish(battle, preWinner) : stepUntilPlayerInputOrEnd(battle, bus);
  return { battle, bus, outcome };
}

/** Which units a given ability can legally be pointed at, for building a
 * target-picker in the UI. Abilities that don't need an explicit pick
 * (self/allAllies/allEnemies) return an empty list — cast them directly.
 * Back-row enemies are excluded from singleEnemy targeting (they can't be
 * targeted directly); back-row allies can still be healed/buffed. */
export function getValidTargets(unit: BattleUnit, ability: Ability, battle: BattleState): BattleUnit[] {
  if (ability.targetType === 'singleAlly') {
    return battle.units.filter((u) => u.alive && u.team === unit.team);
  }
  if (ability.targetType === 'singleEnemy') {
    const opposingTeam = unit.team === 'player' ? 'enemy' : 'player';
    return battle.units.filter((u) => u.alive && u.team === opposingTeam && u.row === 'front');
  }
  return [];
}

/** Fully-automatic AI-vs-AI battle (Auto-Simulate / headless script/test
 * use). Built on the same beginTurn/performAction primitives as the
 * interactive stepper above, so back-row skip-turn and targeting rules are
 * guaranteed identical between the two entry points. */
export function runBattle(setup: BattleSetup): BattleResult {
  const { battle, bus } = createBattleState(setup);

  log(battle, '--- Battle start ---', 'OnBattleStart');
  bus.emit({ type: 'OnBattleStart' });

  let winner = determineWinner(battle);
  while (winner === undefined) {
    const step = beginTurn(battle, bus);
    if ('winner' in step) {
      winner = step.winner;
      break;
    }
    winner = performAction(battle, bus, step.unit);
  }

  log(battle, `--- Battle end: ${winner} wins (${battle.turn} turns) ---`);
  return { winner, log: battle.log, turns: battle.turn, units: battle.units };
}
