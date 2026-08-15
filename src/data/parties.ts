import type { Party } from '../sim/types';

export const DEFAULT_PARTY: Party = {
  id: 'default_party',
  name: 'Default Party',
  slots: [
    { slotIndex: 0, row: 'front', characterId: 'bren_ironhide' },
    { slotIndex: 1, row: 'front', characterId: null },
    { slotIndex: 2, row: 'front', characterId: null },
    { slotIndex: 3, row: 'back', characterId: 'kara_emberwright' },
    { slotIndex: 4, row: 'back', characterId: 'sae_windrunner' },
    { slotIndex: 5, row: 'back', characterId: null },
  ],
};

export const FIRE_BUILD_PARTY: Party = {
  id: 'fire_build_party',
  name: 'Fire Build Party',
  slots: [
    { slotIndex: 0, row: 'front', characterId: 'ryn_cinderveil' },
    { slotIndex: 1, row: 'front', characterId: 'tamsin_ashgrove' },
    { slotIndex: 2, row: 'front', characterId: 'kessa_brightflare' },
    { slotIndex: 3, row: 'back', characterId: 'old_maren' },
    { slotIndex: 4, row: 'back', characterId: 'wick_sparrow' },
    { slotIndex: 5, row: 'back', characterId: 'dez_hollow' },
  ],
};

export const PARTIES: Record<string, Party> = {
  default_party: DEFAULT_PARTY,
  fire_build_party: FIRE_BUILD_PARTY,
};
