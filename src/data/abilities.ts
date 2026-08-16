// ============================================================================
// Ability data. The actual data lives in `abilities.json` (a plain id-keyed
// map) so it can be safely read AND written by the local dev-server data API
// (see vite.config.ts) — the in-app builder screens' "Save" button writes
// straight back into that JSON file, so the file on disk is always the true,
// current source of data, not something Claude has to keep in sync by hand.
// ============================================================================

import type { Ability } from '../sim/types';
import abilitiesJson from './abilities.json';

export const ABILITIES: Record<string, Ability> = abilitiesJson as Record<string, Ability>;
