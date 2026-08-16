// ============================================================================
// Gear data. The actual data lives in `gear.json` (a plain id-keyed map) so
// it can be safely read AND written by the local dev-server data API (see
// vite.config.ts) — the in-app builder screens' "Save" button writes
// straight back into that JSON file, so the file on disk is always the true,
// current source of data, not something Claude has to keep in sync by hand.
// ============================================================================

import type { GearItem } from '../sim/types';
import gearJson from './gear.json';

export const GEAR_ITEMS: Record<string, GearItem> = gearJson as Record<string, GearItem>;
