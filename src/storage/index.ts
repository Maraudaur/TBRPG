import { createStore } from './localStore';
import type {
  Ability,
  CharacterDefinition,
  EnemyDefinition,
  EnemyParty,
  GearItem,
  Party,
  PassiveDef,
  StatusEffectDef,
} from '../sim/types';
import { ABILITIES, CHARACTERS, ENEMIES, ENEMY_PARTIES, GEAR_ITEMS, PARTIES, PASSIVES, STATUS_DEFS } from '../data';

export const characterStore = createStore<CharacterDefinition>('characters');
export const enemyStore = createStore<EnemyDefinition>('enemies');
export const gearStore = createStore<GearItem>('gear');
export const abilityStore = createStore<Ability>('abilities');
export const passiveStore = createStore<PassiveDef>('passives');
export const statusStore = createStore<StatusEffectDef>('statuses');
export const partyStore = createStore<Party>('parties');
export const enemyPartyStore = createStore<EnemyParty>('enemyParties');

/** Adds any new sample data (new abilities, passives, etc. added to the
 * codebase over time) into localStorage, without touching anything the user
 * already has saved/edited. Runs on every app load. */
export function syncSeedData(): void {
  characterStore.seedMissing(CHARACTERS);
  enemyStore.seedMissing(ENEMIES);
  gearStore.seedMissing(GEAR_ITEMS);
  abilityStore.seedMissing(ABILITIES);
  passiveStore.seedMissing(PASSIVES);
  statusStore.seedMissing(STATUS_DEFS);
  partyStore.seedMissing(PARTIES);
  enemyPartyStore.seedMissing(ENEMY_PARTIES);
}
