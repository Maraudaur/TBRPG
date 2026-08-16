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
import { fetchDataType, persistDelete, persistSave, type DataType } from './dataApi';

export const characterStore = createStore<CharacterDefinition>(
  'characters',
  (item) => persistSave('characters', item),
  (id) => persistDelete('characters', id),
);
export const enemyStore = createStore<EnemyDefinition>(
  'enemies',
  (item) => persistSave('enemies', item),
  (id) => persistDelete('enemies', id),
);
export const gearStore = createStore<GearItem>(
  'gear',
  (item) => persistSave('gear', item),
  (id) => persistDelete('gear', id),
);
export const abilityStore = createStore<Ability>(
  'abilities',
  (item) => persistSave('abilities', item),
  (id) => persistDelete('abilities', id),
);
export const passiveStore = createStore<PassiveDef>(
  'passives',
  (item) => persistSave('passives', item),
  (id) => persistDelete('passives', id),
);
export const statusStore = createStore<StatusEffectDef>(
  'statuses',
  (item) => persistSave('statuses', item),
  (id) => persistDelete('statuses', id),
);
export const partyStore = createStore<Party>(
  'parties',
  (item) => persistSave('parties', item),
  (id) => persistDelete('parties', id),
);
export const enemyPartyStore = createStore<EnemyParty>(
  'enemyParties',
  (item) => persistSave('enemyParties', item),
  (id) => persistDelete('enemyParties', id),
);

/** Bundled fallback data, used only when the dev-server data API can't be
 * reached (a production build/preview, or the dev server not running yet).
 * In the normal case (running via "Run Battle Sim.bat" / `npm run dev`)
 * `loadData()` below overwrites this with a live read straight from disk. */
const FALLBACK: Record<DataType, Record<string, { id: string }>> = {
  characters: CHARACTERS,
  enemies: ENEMIES,
  gear: GEAR_ITEMS,
  abilities: ABILITIES,
  passives: PASSIVES,
  statuses: STATUS_DEFS,
  parties: PARTIES,
  enemyParties: ENEMY_PARTIES,
};

const STORES = {
  characters: characterStore,
  enemies: enemyStore,
  gear: gearStore,
  abilities: abilityStore,
  passives: passiveStore,
  statuses: statusStore,
  parties: partyStore,
  enemyParties: enemyPartyStore,
} as const;

/** Hard-syncs every store's local cache from the real src/data/*.json files
 * on disk (via the dev-server data API), so the app always opens showing
 * exactly what's actually on disk — no separate "seed" step, no drift, and
 * no manual refresh button needed. Falls back to the JSON bundled at build
 * time for any type the API can't currently serve (e.g. a production build
 * with no dev server behind it), so the app still has something to show.
 * Runs once, at app boot, before the first render. */
export async function loadData(): Promise<void> {
  const types = Object.keys(STORES) as DataType[];
  await Promise.all(
    types.map(async (type) => {
      const fromDisk = await fetchDataType(type);
      const store = STORES[type] as { replaceAll(data: Record<string, unknown>): void };
      store.replaceAll(fromDisk ?? FALLBACK[type]);
    }),
  );
}
