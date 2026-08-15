import { describe, expect, it } from 'vitest';
import { runBattle } from './battleLoop';
import { ABILITIES, CHARACTERS, ENEMIES, GEAR_ITEMS, STATUS_DEFS } from '../data';

function seededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe('headless battle loop', () => {
  it('runs a hardcoded party vs enemy battle to a winner and logs every trigger fired', () => {
    const result = runBattle({
      player: [
        { def: CHARACTERS.bren_ironhide, row: 'front' },
        { def: CHARACTERS.kara_emberwright, row: 'back' },
        { def: CHARACTERS.sae_windrunner, row: 'back' },
      ],
      enemies: [
        { def: ENEMIES.frost_wraith, row: 'front' },
        { def: ENEMIES.goblin_brute, row: 'front' },
      ],
      gearLookup: GEAR_ITEMS,
      abilityLookup: ABILITIES,
      statusDefs: STATUS_DEFS,
      rng: seededRng(42),
      maxTurns: 200,
    });

    expect(['player', 'enemy', 'draw']).toContain(result.winner);
    expect(result.winner).not.toBe('draw'); // with these stats one side should win within 200 turns
    expect(result.log.length).toBeGreaterThan(0);
    expect(result.turns).toBeGreaterThan(0);
    expect(result.turns).toBeLessThanOrEqual(200);

    // sanity: at least one of every core trigger type shows up across a full battle
    const eventTypes = new Set(result.log.map((l) => l.eventType).filter(Boolean));
    expect(eventTypes.has('OnBattleStart')).toBe(true);
    expect(eventTypes.has('OnTurnStart')).toBe(true);
    expect(eventTypes.has('OnAbilityCast')).toBe(true);
    expect(eventTypes.has('OnDamageDealt')).toBe(true);
  });

  it('is deterministic given the same seeded rng', () => {
    const setup = {
      player: [{ def: CHARACTERS.bren_ironhide, row: 'front' as const }],
      enemies: [{ def: ENEMIES.goblin_brute, row: 'front' as const }],
      gearLookup: GEAR_ITEMS,
      abilityLookup: ABILITIES,
      statusDefs: STATUS_DEFS,
      maxTurns: 100,
    };
    const r1 = runBattle({ ...setup, rng: seededRng(7) });
    const r2 = runBattle({ ...setup, rng: seededRng(7) });
    expect(r1.winner).toBe(r2.winner);
    expect(r1.turns).toBe(r2.turns);
    expect(r1.log.map((l) => l.message)).toEqual(r2.log.map((l) => l.message));
  });
});
