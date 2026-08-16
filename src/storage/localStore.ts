// ============================================================================
// localStorage-backed persistence layer. Each entity type gets its own
// namespaced key holding a JSON-serialized `Record<id, entity>` map.
//
// This is a fast, synchronous, same-tab cache — every builder screen reads
// it directly. It is NOT the source of truth: at app boot, `replaceAll()` is
// used to hard-sync this cache from the real `src/data/*.json` files on disk
// (via the dev-server data API, see storage/index.ts + vite-data-api-plugin
// .ts), and every `save()`/`delete()` fires a best-effort write straight
// back to those same files — so the file on disk and whatever's on screen
// can never drift apart the way they used to.
// ============================================================================

const PREFIX = 'battlesim:';

function readAll<T>(key: string): Record<string, T> {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function writeAll<T>(key: string, data: Record<string, T>): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(data));
}

export interface Store<T extends { id: string }> {
  list(): T[];
  get(id: string): T | undefined;
  /** Writes to the local cache immediately (so the UI updates instantly)
   * and fires a best-effort request to persist the change to the real
   * src/data/*.json file on disk. */
  save(item: T): void;
  /** Removes from the local cache immediately and fires a best-effort
   * request to remove the entry from the real src/data/*.json file too. */
  delete(id: string): void;
  /** Wholesale-replaces the local cache with `data`, no merging. Used once
   * at app boot to hard-sync from whatever the data API (or, failing that,
   * the bundled JSON fallback) reports as current. */
  replaceAll(data: Record<string, T>): void;
}

/** `onSave`/`onDelete` are the best-effort disk-persistence hooks — kept as
 * injected callbacks (rather than importing the API client directly here)
 * so this module stays a plain, dependency-free cache layer. */
export function createStore<T extends { id: string }>(
  key: string,
  onSave?: (item: T) => void,
  onDelete?: (id: string) => void,
): Store<T> {
  return {
    list(): T[] {
      return Object.values(readAll<T>(key));
    },
    get(id: string): T | undefined {
      return readAll<T>(key)[id];
    },
    save(item: T): void {
      const all = readAll<T>(key);
      all[item.id] = item;
      writeAll(key, all);
      onSave?.(item);
    },
    delete(id: string): void {
      const all = readAll<T>(key);
      delete all[id];
      writeAll(key, all);
      onDelete?.(id);
    },
    replaceAll(data: Record<string, T>): void {
      writeAll(key, data);
    },
  };
}
