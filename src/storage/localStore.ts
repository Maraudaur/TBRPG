// ============================================================================
// Generic localStorage-backed persistence layer. Each entity type gets its
// own namespaced key holding a JSON-serialized `Record<id, entity>` map.
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
  save(item: T): void;
  delete(id: string): void;
  /** Adds any seed entries whose id isn't already present — never touches or
   * overwrites existing entries (including ones the user edited away from
   * the seed). This runs on every app load, so new sample data added to the
   * codebase (a new ability, a new passive, ...) shows up automatically
   * without wiping anything already saved. */
  seedMissing(seed: Record<string, T>): void;
}

export function createStore<T extends { id: string }>(key: string): Store<T> {
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
    },
    delete(id: string): void {
      const all = readAll<T>(key);
      delete all[id];
      writeAll(key, all);
    },
    seedMissing(seed: Record<string, T>): void {
      const all = readAll<T>(key);
      let changed = false;
      for (const [id, item] of Object.entries(seed)) {
        if (!(id in all)) {
          all[id] = item;
          changed = true;
        }
      }
      if (changed) writeAll(key, all);
    },
  };
}
