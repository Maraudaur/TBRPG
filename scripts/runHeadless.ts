// ============================================================================
// Standalone headless battle runner. Run with `npm run headless`.
//
// This is the sanity-check step called out in the tech doc's build order:
// verify the resolver/event chain engine works BEFORE building any UI.
// Prints every trigger/condition/effect that fired during a hardcoded
// party-vs-enemy battle.
// ============================================================================

import { runBattle } from '../src/sim/battleLoop';
import { ABILITIES, CHARACTERS, ENEMIES, GEAR_ITEMS, STATUS_DEFS } from '../src/data';

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
  maxTurns: 200,
});

for (const entry of result.log) {
  const tag = entry.eventType ? `[${entry.eventType}]` : '';
  console.log(`T${entry.turn.toString().padStart(3, '0')} ${tag.padEnd(22)} ${entry.message}`);
}

console.log('');
console.log(`Winner: ${result.winner} after ${result.turns} turns (${result.log.length} log entries)`);
