import { describe, expect, it } from 'vitest';
import { EventBus } from './eventBus';
import { attachResolver, evaluateCondition, executeEffect } from './resolver';
import type { BattleState, BattleUnit } from './runtime';
import { ASHBORN_RING } from '../data/gear';
import { STATUS_DEFS } from '../data/statuses';
import type { Condition, StatBlock } from './types';

function makeStats(overrides: Partial<StatBlock> = {}): StatBlock {
  return {
    maxHp: 100,
    maxAp: 20,
    atk: 10,
    def: 5,
    matk: 20,
    mdef: 0,
    speed: 10,
    critChance: 0, // deterministic: never crit
    critDamage: 1.5,
    accuracy: 1,
    evasion: 0,
    ...overrides,
  };
}

function makeUnit(id: string, team: 'player' | 'enemy', overrides: Partial<BattleUnit> = {}): BattleUnit {
  const stats = overrides.currentStats ?? makeStats();
  return {
    id,
    defId: id,
    name: id,
    team,
    row: 'front',
    level: 1,
    baseStats: stats,
    statModifiers: [],
    currentStats: stats,
    currentHp: stats.maxHp,
    currentAp: stats.maxAp,
    statuses: [],
    bindings: [],
    abilities: [],
    alive: true,
    nextAvailable: 0,
    crossedThresholds: new Set(),
    ...overrides,
  };
}

function makeBattle(units: BattleUnit[]): { battle: BattleState; bus: EventBus } {
  const battle: BattleState = {
    units,
    turn: 1,
    log: [],
    rng: () => 0.999, // never triggers chance-based conditions / crits by default
    statusDefs: STATUS_DEFS,
    maxTurns: 50,
  };
  const bus = new EventBus();
  attachResolver(battle, bus);
  return { battle, bus };
}

describe('resolver — shatter combo end to end (ashborn ring)', () => {
  it('consumes burn stacks for bonus fire damage when the ring wearer deals fire damage', () => {
    const attacker = makeUnit('atk1', 'player', { bindings: [...ASHBORN_RING.bindings!] });
    const defender = makeUnit('def1', 'enemy', {
      statuses: [{ statusId: 'burn', stacks: 4, duration: 3 }],
    });
    const { battle, bus } = makeBattle([attacker, defender]);

    // Simulate an ability's DealDamage effect (20 raw fire damage, 0 mitigation).
    executeEffect(
      { type: 'DealDamage', target: 'target', formula: '20', element: 'fire' },
      {
        ownerId: 'atk1',
        event: { type: 'OnAbilityCast', source: 'atk1', target: 'def1', element: 'fire' },
        battle,
        bus,
        vars: {},
        bindingLabel: 'Test Fireball',
      },
    );

    // Initial hit: 20 dmg. Ring then consumes 4 burn stacks -> 4*5 = 20 bonus dmg.
    expect(defender.currentHp).toBe(100 - 20 - 20);
    expect(defender.statuses.find((s) => s.statusId === 'burn')).toBeUndefined();

    const combustionLogs = battle.log.filter((l) => l.message.includes('Combustion'));
    expect(combustionLogs.length).toBeGreaterThan(0);

    // The chain must terminate (no infinite loop) — exactly two damage log lines.
    const damageLogs = battle.log.filter((l) => l.eventType === 'OnDamageDealt');
    expect(damageLogs.length).toBe(2);
  });

  it('does not proc when the ring wearer is not the one dealing damage', () => {
    const attacker = makeUnit('atk1', 'player', { bindings: [] });
    const ringBearer = makeUnit('ally1', 'player', { bindings: [...ASHBORN_RING.bindings!] });
    const defender = makeUnit('def1', 'enemy', {
      statuses: [{ statusId: 'burn', stacks: 4, duration: 3 }],
    });
    const { battle, bus } = makeBattle([attacker, ringBearer, defender]);

    executeEffect(
      { type: 'DealDamage', target: 'target', formula: '20', element: 'fire' },
      {
        ownerId: 'atk1',
        event: { type: 'OnAbilityCast', source: 'atk1', target: 'def1', element: 'fire' },
        battle,
        bus,
        vars: {},
        bindingLabel: 'Test Fireball',
      },
    );

    // Only the base 20 damage — ring bearer wasn't the source, so 'self' fails.
    expect(defender.currentHp).toBe(100 - 20);
    expect(defender.statuses.find((s) => s.statusId === 'burn')?.stacks).toBe(4);
  });
});

describe('resolver — condition composition (AllOf/AnyOf/Not)', () => {
  const battleUnits = [makeUnit('a', 'player'), makeUnit('b', 'enemy')];
  const { battle } = makeBattle(battleUnits);
  const event = { type: 'OnDamageDealt' as const, source: 'a', target: 'b', element: 'fire' as const };

  it('allOf requires every nested condition to pass', () => {
    const cond: Condition = {
      type: 'allOf',
      conditions: [{ type: 'element', value: 'fire' }, { type: 'self' }],
    };
    expect(evaluateCondition(cond, 'a', event, battle)).toBe(true);

    const failing: Condition = {
      type: 'allOf',
      conditions: [{ type: 'element', value: 'ice' }, { type: 'self' }],
    };
    expect(evaluateCondition(failing, 'a', event, battle)).toBe(false);
  });

  it('anyOf requires at least one nested condition to pass', () => {
    const cond: Condition = {
      type: 'anyOf',
      conditions: [{ type: 'element', value: 'ice' }, { type: 'element', value: 'fire' }],
    };
    expect(evaluateCondition(cond, 'a', event, battle)).toBe(true);
  });

  it('not inverts the nested condition', () => {
    const cond: Condition = { type: 'not', condition: { type: 'element', value: 'ice' } };
    expect(evaluateCondition(cond, 'a', event, battle)).toBe(true);

    const cond2: Condition = { type: 'not', condition: { type: 'element', value: 'fire' } };
    expect(evaluateCondition(cond2, 'a', event, battle)).toBe(false);
  });

  it('supports nesting AnyOf inside AllOf for (A AND (B OR C)) logic', () => {
    const cond: Condition = {
      type: 'allOf',
      conditions: [
        { type: 'self' },
        { type: 'anyOf', conditions: [{ type: 'element', value: 'ice' }, { type: 'element', value: 'fire' }] },
      ],
    };
    expect(evaluateCondition(cond, 'a', event, battle)).toBe(true);
  });
});

describe('resolver — priority ordering', () => {
  it('executes higher-priority bindings before lower-priority ones on the same trigger', () => {
    const attacker = makeUnit('atk1', 'player', {
      bindings: [
        {
          id: 'low',
          trigger: 'OnTurnStart',
          priority: 1,
          conditions: [],
          effects: [{ type: 'ModifyAP', target: 'self', amount: 1 }],
        },
        {
          id: 'high',
          trigger: 'OnTurnStart',
          priority: 10,
          conditions: [],
          effects: [{ type: 'ModifyAP', target: 'self', amount: 2 }],
        },
      ],
    });
    const { battle, bus } = makeBattle([attacker]);

    bus.emit({ type: 'OnTurnStart', source: 'atk1', target: 'atk1' });

    const apLogs = battle.log.filter((l) => l.message.includes("AP changes"));
    expect(apLogs.length).toBe(2);
    expect(apLogs[0].message).toContain('[high]');
    expect(apLogs[1].message).toContain('[low]');
  });
});
