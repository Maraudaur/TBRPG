// ============================================================================
// Thin client for the local dev-server data API (see vite-data-api-plugin
// .ts). Every function is best-effort: the API only exists while `vite dev`
// is running (which is how this app is always actually run, via
// "Run Battle Sim.bat"), so a production build/preview or any network hiccup
// just silently falls back to whatever's already cached — nothing breaks,
// it just stops being able to persist to disk until the API is reachable
// again.
// ============================================================================

export type DataType =
  | 'characters'
  | 'enemies'
  | 'gear'
  | 'abilities'
  | 'passives'
  | 'statuses'
  | 'parties'
  | 'enemyParties';

/** Fetches the whole id-keyed map for one data type straight from its
 * src/data/*.json file on disk. Returns undefined (rather than throwing) if
 * the dev API isn't reachable, so callers can fall back to bundled data. */
export async function fetchDataType<T>(type: DataType): Promise<Record<string, T> | undefined> {
  try {
    const res = await fetch(`/api/data/${type}`);
    if (!res.ok) return undefined;
    return (await res.json()) as Record<string, T>;
  } catch {
    return undefined;
  }
}

/** Best-effort: persists one item to disk. Failures are swallowed (and
 * logged) since the in-memory/localStorage copy has already been updated by
 * the caller — the user's edit is never lost from the UI even if this
 * fails, it just won't have reached the file this time. */
export function persistSave<T>(type: DataType, item: T & { id: string }): void {
  fetch(`/api/data/${type}/${encodeURIComponent(item.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(item),
  }).catch((err) => {
    console.warn(`[battle-sim] couldn't persist ${type}/${item.id} to disk (is the dev server running?):`, err);
  });
}

/** Best-effort: removes one item from disk. Same failure handling as
 * persistSave. */
export function persistDelete(type: DataType, id: string): void {
  fetch(`/api/data/${type}/${encodeURIComponent(id)}`, { method: 'DELETE' }).catch((err) => {
    console.warn(`[battle-sim] couldn't remove ${type}/${id} on disk (is the dev server running?):`, err);
  });
}
