// ============================================================================
// Effect resolver — the highest-risk piece of the sim (per tech doc).
//
// Responsibilities:
//   - evaluate Condition trees (AllOf/AnyOf/Not composition)
//   - given a fired TriggerEvent, gather every binding (gear/passive/status)
//     across all units that listens for that trigger, filter by conditions,
//     order by priority, and execute their effects
//   - execute Effects, which mutate BattleState and emit further
//     TriggerEvents on the EventBus, allowing chains to resolve recursively
//
// Ability-cast bindings are NOT gathered generically here — see battleLoop's
// castAbility(), which executes an ability's own OnAbilityCast binding
// directly so that casting one ability can never accidentally fire another
// ability's cast binding. Bindings gathered here come from gear, innate
// passives, and active status effects.
// ============================================================================

import { computeStats } from './statPipeline';
import { evaluateFormula } from './formula';
import type { BattleState, BattleUnit } from './runtime';
import { getUnit, log } from './runtime';
import { EventBus } from './eventBus';
import type {
  Binding,
  Condition,
  ConditionSubject,
  Effect,
  EffectTarget,
  StatCompareStat,
  TriggerEvent,
  TriggerType,
} from './types';

export interface ExecutionContext {
  ownerId: string;
  event: TriggerEvent;
  battle: BattleState;
  bus: EventBus;
  /** scratch vars shared across all effects within ONE binding's execution */
  vars: Record<string, number>;
  bindingLabel: string;
}

// ---------------------------------------------------------------------------
// Condition evaluation
// ---------------------------------------------------------------------------

function resolveSubject(subject: ConditionSubject, ownerId: string, event: TriggerEvent): string | undefined {
  if (subject === 'self') return ownerId;
  if (subject === 'target') return event.target;
  return event.source;
}

function readStat(unit: BattleUnit, stat: StatCompareStat): number {
  if (stat === 'currentHp') return unit.currentHp;
  if (stat === 'currentAp') return unit.currentAp;
  if (stat === 'hpPercent') return unit.currentStats.maxHp > 0 ? unit.currentHp / unit.currentStats.maxHp : 0;
  return unit.currentStats[stat];
}

function compare(a: number, op: string, b: number): boolean {
  switch (op) {
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '>=':
      return a >= b;
    case '==':
      return a === b;
    case '!=':
      return a !== b;
    default:
      return false;
  }
}

export function evaluateCondition(
  condition: Condition,
  ownerId: string,
  event: TriggerEvent,
  battle: BattleState,
): boolean {
  switch (condition.type) {
    case 'self': {
      // owner participated in this event as EITHER the source or the target.
      // Combined with the trigger type (OnDamageDealt vs OnDamageTaken, etc)
      // this disambiguates "I caused this" vs "this happened to me".
      if (event.source === undefined && event.target === undefined) return true; // global event
      return ownerId === event.source || ownerId === event.target;
    }
    case 'teammate': {
      // true iff the unit at `target` is on the owner's team AND isn't the
      // owner itself — the "an ally, not me" scope that `self` can't express.
      const subjectId = resolveSubject(condition.target, ownerId, event);
      if (!subjectId || subjectId === ownerId) return false;
      const owner = getUnit(battle, ownerId);
      const unit = getUnit(battle, subjectId);
      if (!owner || !unit) return false;
      return unit.team === owner.team;
    }
    case 'wasCrit':
      return event.isCrit === true;
    case 'abilityIs':
      return event.ability === condition.value;
    case 'statCompare': {
      const subjectId = resolveSubject(condition.target, ownerId, event);
      const unit = getUnit(battle, subjectId);
      if (!unit) return false;
      return compare(readStat(unit, condition.stat), condition.op, condition.value);
    }
    case 'hasStatus': {
      const subjectId = resolveSubject(condition.target, ownerId, event);
      const unit = getUnit(battle, subjectId);
      if (!unit) return false;
      const instance = unit.statuses.find((s) => s.statusId === condition.status);
      const stacks = instance?.stacks ?? 0;
      const min = condition.min ?? (condition.max === undefined ? 1 : 0);
      const max = condition.max ?? Infinity;
      return stacks >= min && stacks <= max;
    }
    case 'element':
      return event.element === condition.value;
    case 'row': {
      const subjectId = resolveSubject(condition.target, ownerId, event);
      const unit = getUnit(battle, subjectId);
      if (!unit) return false;
      return unit.row === condition.row;
    }
    case 'chance':
      return battle.rng() < condition.probability;
    case 'allOf':
      return condition.conditions.every((c) => evaluateCondition(c, ownerId, event, battle));
    case 'anyOf':
      return condition.conditions.some((c) => evaluateCondition(c, ownerId, event, battle));
    case 'not':
      return !evaluateCondition(condition.condition, ownerId, event, battle);
  }
}

export function evaluateConditions(
  conditions: Condition[],
  ownerId: string,
  event: TriggerEvent,
  battle: BattleState,
): boolean {
  return conditions.every((c) => evaluateCondition(c, ownerId, event, battle));
}

// ---------------------------------------------------------------------------
// Effect target resolution
// ---------------------------------------------------------------------------

export function resolveEffectTargets(target: EffectTarget, ownerId: string, event: TriggerEvent, battle: BattleState): string[] {
  const owner = getUnit(battle, ownerId);
  switch (target) {
    case 'self':
      return [ownerId];
    case 'target':
      return event.target ? [event.target] : [];
    case 'source':
      return event.source ? [event.source] : [];
    case 'allEnemies':
      return owner ? battle.units.filter((u) => u.alive && u.team !== owner.team).map((u) => u.id) : [];
    case 'allAllies':
      return owner ? battle.units.filter((u) => u.alive && u.team === owner.team).map((u) => u.id) : [];
  }
}

// ---------------------------------------------------------------------------
// Stat recompute helper (shared with battleLoop)
// ---------------------------------------------------------------------------

export function recomputeStats(unit: BattleUnit): void {
  unit.currentStats = computeStats(unit.baseStats, unit.statModifiers);
  unit.currentHp = Math.min(unit.currentHp, unit.currentStats.maxHp);
  unit.currentAp = Math.min(unit.currentAp, unit.currentStats.maxAp);
}

// ---------------------------------------------------------------------------
// HP threshold / death bookkeeping
// ---------------------------------------------------------------------------

const HP_THRESHOLDS = [0.5, 0.25];

function checkHpThresholds(target: BattleUnit, sourceId: string | undefined, battle: BattleState, bus: EventBus): void {
  const percent = target.currentStats.maxHp > 0 ? target.currentHp / target.currentStats.maxHp : 0;
  for (const threshold of HP_THRESHOLDS) {
    if (percent <= threshold && !target.crossedThresholds.has(threshold)) {
      target.crossedThresholds.add(threshold);
      log(battle, `${target.name} has crossed the ${Math.round(threshold * 100)}% HP threshold`, 'OnHPThresholdCrossed', {
        kind: 'hpThreshold',
        target: target.id,
        threshold,
      });
      bus.emit({ type: 'OnHPThresholdCrossed', source: sourceId, target: target.id, threshold });
    }
  }
}

/** When a front-row unit dies, a living back-row teammate (if any) steps up
 * to fill the gap — this is what keeps a team always targetable/actionable
 * as long as anyone on it is still alive, without needing a fallback that
 * lets the back row be targeted directly. */
function promoteBackRowIfNeeded(deadUnit: BattleUnit, battle: BattleState, bus: EventBus): void {
  if (deadUnit.row !== 'front') return;
  const replacement = battle.units.find((u) => u.alive && u.team === deadUnit.team && u.row === 'back');
  if (!replacement) return;
  replacement.row = 'front';
  log(battle, `${replacement.name} moves up to the front row.`, 'OnRowChanged', {
    kind: 'rowChange',
    target: replacement.id,
    row: 'front',
  });
  bus.emit({ type: 'OnRowChanged', target: replacement.id });
}

/** Strips every stat modifier `deadUnit` granted to anyone (aura passives
 * applied via ModifyStat with no `duration`, tagged with sourceUnitId when
 * created) — the "while I'm alive" half of an aura, distinct from
 * duration-based expiry which already handles temporary buffs. */
function stripAurasFromDeadUnit(deadUnit: BattleUnit, battle: BattleState): void {
  for (const unit of battle.units) {
    const before = unit.statModifiers.length;
    unit.statModifiers = unit.statModifiers.filter((m) => m.sourceUnitId !== deadUnit.id);
    if (unit.statModifiers.length !== before) recomputeStats(unit);
  }
}

function checkDeath(target: BattleUnit, battle: BattleState, bus: EventBus): void {
  if (target.currentHp <= 0 && target.alive) {
    target.alive = false;
    log(battle, `${target.name} has died`, 'OnDeath', { kind: 'death', target: target.id });
    bus.emit({ type: 'OnDeath', source: target.id, target: target.id });
    stripAurasFromDeadUnit(target, battle);
    promoteBackRowIfNeeded(target, battle, bus);
  }
}

// ---------------------------------------------------------------------------
// Effect execution
// ---------------------------------------------------------------------------

/** Appends "(via Owner Name)" to a log message when the binding's owner
 * (the character/enemy holding the passive/ability/gear affix) is a
 * different unit than whoever the effect actually landed on — e.g. an
 * Igniter's "Fan the Flames" passive applying burn to an enemy. Omitted
 * when they're the same unit (e.g. a self-targeted buff), since the
 * message already reads unambiguously without it. */
function viaSuffix(owner: BattleUnit, target: BattleUnit): string {
  return owner.id === target.id ? '' : ` (via ${owner.name})`;
}

export function executeEffect(effect: Effect, ctx: ExecutionContext): void {
  const { ownerId, event, battle, bus, vars, bindingLabel } = ctx;
  const owner = getUnit(battle, ownerId);
  if (!owner) return;
  const targetIds = resolveEffectTargets(effect.target, ownerId, event, battle);

  switch (effect.type) {
    case 'DealDamage': {
      for (const targetId of targetIds) {
        const target = getUnit(battle, targetId);
        if (!target || !target.alive) continue;
        const formulaVars: Record<string, number> = {
          atk: owner.currentStats.atk,
          matk: owner.currentStats.matk,
          def: owner.currentStats.def,
          mdef: owner.currentStats.mdef,
          speed: owner.currentStats.speed,
          level: owner.level,
          targetAtk: target.currentStats.atk,
          targetDef: target.currentStats.def,
          targetMatk: target.currentStats.matk,
          targetMdef: target.currentStats.mdef,
          targetMaxHp: target.currentStats.maxHp,
          targetCurrentHp: target.currentHp,
          ...vars,
        };
        const raw = evaluateFormula(effect.formula, formulaVars);
        const mitigationStat = effect.element === 'physical' ? target.currentStats.def : target.currentStats.mdef;
        let dmg = Math.max(0, raw - mitigationStat * 0.5);
        if (effect.element === 'physical' && target.row === 'back') {
          dmg *= 0.75; // back row takes reduced physical damage
        }
        let isCrit = false;
        if (battle.rng() < owner.currentStats.critChance) {
          dmg *= owner.currentStats.critDamage;
          isCrit = true;
        }
        dmg = raw > 0 ? Math.max(1, Math.round(dmg)) : 0;
        target.currentHp = Math.max(0, target.currentHp - dmg);
        log(
          battle,
          `[${bindingLabel}] ${owner.name} deals ${dmg} ${effect.element} damage to ${target.name}${isCrit ? ' (CRIT)' : ''} (${target.currentHp}/${target.currentStats.maxHp} HP left)`,
          'OnDamageDealt',
          { kind: 'damage', source: ownerId, target: targetId, damage: dmg, element: effect.element, isCrit },
        );
        bus.emit({ type: 'OnDamageDealt', source: ownerId, target: targetId, element: effect.element, damage: dmg, isCrit });
        bus.emit({ type: 'OnDamageTaken', source: ownerId, target: targetId, element: effect.element, damage: dmg, isCrit });
        checkHpThresholds(target, ownerId, battle, bus);
        checkDeath(target, battle, bus);
      }
      break;
    }
    case 'ApplyStatus': {
      for (const targetId of targetIds) {
        const target = getUnit(battle, targetId);
        if (!target || !target.alive) continue;
        const def = battle.statusDefs[effect.status];
        const stacksToAdd = effect.stacks ?? 1;
        const duration = effect.duration ?? def?.defaultDuration ?? 3;
        const existing = target.statuses.find((s) => s.statusId === effect.status);
        if (existing && def?.stackable) {
          existing.stacks = Math.min(existing.stacks + stacksToAdd, def.maxStacks ?? Infinity);
          existing.duration = Math.max(existing.duration, duration);
        } else if (existing && !def?.stackable) {
          existing.duration = Math.max(existing.duration, duration);
        } else {
          target.statuses.push({ statusId: effect.status, stacks: stacksToAdd, duration });
        }
        log(battle, `[${bindingLabel}] ${target.name} gains ${stacksToAdd} stack(s) of ${effect.status}${viaSuffix(owner, target)}`, 'OnStatusApplied', {
          kind: 'statusApplied',
          source: ownerId,
          target: targetId,
          status: effect.status,
          stacks: stacksToAdd,
        });
        bus.emit({ type: 'OnStatusApplied', source: ownerId, target: targetId, status: effect.status, stacks: stacksToAdd });
      }
      break;
    }
    case 'ConsumeStatus': {
      for (const targetId of targetIds) {
        const target = getUnit(battle, targetId);
        if (!target) continue;
        const existing = target.statuses.find((s) => s.statusId === effect.status);
        const removed = existing ? (effect.count === 'all' ? existing.stacks : Math.min(effect.count, existing.stacks)) : 0;
        vars.stacksConsumed = (vars.stacksConsumed ?? 0) + removed;
        if (existing) {
          existing.stacks -= removed;
          if (existing.stacks <= 0) {
            target.statuses = target.statuses.filter((s) => s !== existing);
            log(battle, `[${bindingLabel}] ${target.name}'s ${effect.status} is consumed (${removed} stacks)${viaSuffix(owner, target)}`, 'OnStatusExpired', {
              kind: 'statusExpired',
              source: ownerId,
              target: targetId,
              status: effect.status,
              stacks: removed,
            });
            bus.emit({ type: 'OnStatusExpired', source: ownerId, target: targetId, status: effect.status, stacks: removed });
          } else if (removed > 0) {
            log(battle, `[${bindingLabel}] ${target.name}'s ${effect.status} is reduced by ${removed} stacks${viaSuffix(owner, target)}`, undefined, {
              kind: 'statusReduced',
              source: ownerId,
              target: targetId,
              status: effect.status,
              stacks: removed,
            });
          }
        }
      }
      break;
    }
    case 'ModifyStat': {
      for (const targetId of targetIds) {
        const target = getUnit(battle, targetId);
        if (!target) continue;
        target.statModifiers.push({
          stat: effect.stat,
          type: effect.modType,
          value: effect.value,
          source: bindingLabel,
          duration: effect.duration,
          // Links this modifier back to whoever granted it, so a "while I'm
          // alive" aura (see checkDeath) can strip it from recipients the
          // instant its source dies — separate from `duration`-based expiry.
          sourceUnitId: ownerId,
        });
        recomputeStats(target);
        log(battle, `[${bindingLabel}] ${target.name}'s ${effect.stat} is modified (${effect.modType} ${effect.value})${viaSuffix(owner, target)}`, undefined, {
          kind: 'statMod',
          source: ownerId,
          target: targetId,
          stat: effect.stat,
          modType: effect.modType,
          value: effect.value,
          duration: effect.duration,
        });
      }
      break;
    }
    case 'Heal': {
      for (const targetId of targetIds) {
        const target = getUnit(battle, targetId);
        if (!target || !target.alive) continue;
        const formulaVars: Record<string, number> = {
          atk: owner.currentStats.atk,
          matk: owner.currentStats.matk,
          level: owner.level,
          ...vars,
        };
        const amount = Math.max(0, Math.round(evaluateFormula(effect.formula, formulaVars)));
        target.currentHp = Math.min(target.currentStats.maxHp, target.currentHp + amount);
        log(battle, `[${bindingLabel}] ${target.name} heals ${amount} HP (${target.currentHp}/${target.currentStats.maxHp})${viaSuffix(owner, target)}`, undefined, {
          kind: 'heal',
          source: ownerId,
          target: targetId,
          amount,
        });
      }
      break;
    }
    case 'GrantExtraTurn': {
      for (const targetId of targetIds) {
        const target = getUnit(battle, targetId);
        if (!target || !target.alive) continue;
        const soonest = Math.min(...battle.units.filter((u) => u.alive).map((u) => u.nextAvailable));
        target.nextAvailable = soonest - 1;
        log(battle, `[${bindingLabel}] ${target.name} gains an extra turn${viaSuffix(owner, target)}`, undefined, {
          kind: 'extraTurn',
          source: ownerId,
          target: targetId,
        });
      }
      break;
    }
    case 'ModifyAP': {
      for (const targetId of targetIds) {
        const target = getUnit(battle, targetId);
        if (!target) continue;
        target.currentAp = Math.max(0, Math.min(target.currentStats.maxAp, target.currentAp + effect.amount));
        log(battle, `[${bindingLabel}] ${target.name}'s AP changes by ${effect.amount} (now ${target.currentAp})${viaSuffix(owner, target)}`, undefined, {
          kind: 'apChange',
          source: ownerId,
          target: targetId,
          amount: effect.amount,
        });
      }
      break;
    }
    case 'SwitchRow': {
      for (const targetId of targetIds) {
        const target = getUnit(battle, targetId);
        if (!target || !target.alive) continue;
        const nextRow = effect.row ?? (target.row === 'front' ? 'back' : 'front');
        if (nextRow === target.row) continue;
        target.row = nextRow;
        log(battle, `[${bindingLabel}] ${target.name} switches to the ${nextRow} row.${viaSuffix(owner, target)}`, 'OnRowChanged', {
          kind: 'rowChange',
          source: ownerId,
          target: targetId,
          row: nextRow,
        });
        bus.emit({ type: 'OnRowChanged', source: ownerId, target: targetId });
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Trigger resolution — gathers reactive bindings (gear/passive/status) that
// listen to the fired event's trigger type, filters by conditions, sorts by
// priority, and executes their effects in order.
// ---------------------------------------------------------------------------

interface Candidate {
  ownerId: string;
  binding: Binding;
  /** extra formula vars seeded for this specific candidate, e.g. a status's stack count */
  seedVars?: Record<string, number>;
}

function gatherBindings(battle: BattleState, triggerType: TriggerType): Candidate[] {
  const candidates: Candidate[] = [];
  for (const unit of battle.units) {
    for (const binding of unit.bindings) {
      if (binding.trigger === triggerType) candidates.push({ ownerId: unit.id, binding });
    }
    for (const status of unit.statuses) {
      const def = battle.statusDefs[status.statusId];
      if (!def?.bindings) continue;
      for (const binding of def.bindings) {
        if (binding.trigger === triggerType) {
          candidates.push({ ownerId: unit.id, binding, seedVars: { stacks: status.stacks } });
        }
      }
    }
  }
  return candidates;
}

export function resolveTrigger(event: TriggerEvent, battle: BattleState, bus: EventBus): void {
  const candidates = gatherBindings(battle, event.type).filter(({ ownerId, binding }) =>
    evaluateConditions(binding.conditions, ownerId, event, battle),
  );
  candidates.sort((a, b) => (b.binding.priority ?? 0) - (a.binding.priority ?? 0));

  for (const { ownerId, binding, seedVars } of candidates) {
    const owner = getUnit(battle, ownerId);
    if (!owner || !owner.alive) continue;
    const vars: Record<string, number> = { ...seedVars, ...event.vars };
    const bindingLabel = binding.name ?? binding.id ?? `${owner.name}'s ${binding.trigger} binding`;
    for (const effect of binding.effects) {
      executeEffect(effect, { ownerId, event, battle, bus, vars, bindingLabel });
    }
  }
}

const DEFAULT_MAX_DEPTH = 25;

/**
 * Wires the resolver into the event bus. Every emitted event re-enters
 * resolveTrigger(), which is how chains (DealDamage -> OnDamageDealt ->
 * reactive binding -> DealDamage -> ...) happen automatically. A depth
 * guard prevents runaway loops from carelessly authored data.
 */
export function attachResolver(battle: BattleState, bus: EventBus, maxDepth = DEFAULT_MAX_DEPTH): void {
  let depth = 0;
  bus.onAny((event) => {
    depth++;
    if (depth > maxDepth) {
      log(battle, `Max resolution depth (${maxDepth}) exceeded — aborting further chains for ${event.type}`);
      depth--;
      return;
    }
    try {
      resolveTrigger(event, battle, bus);
    } finally {
      depth--;
    }
  });
}
