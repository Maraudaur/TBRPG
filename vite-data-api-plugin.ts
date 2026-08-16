// ============================================================================
// Local dev-server data API. Dev mode only (configureServer never runs
// during `vite build`/`vite preview`). Lets the in-app builder screens'
// "Save"/"delete" actions write straight back into the real src/data/*.json
// files on disk, instead of only ever landing in the browser's localStorage
// — the whole point being that the code (what Claude edits) and whatever
// the user edits in the app are the SAME file, so they can never drift.
//
// Routes (all under /api/data/):
//   GET    /api/data/:type          -> the whole id-keyed map for that type
//   PUT    /api/data/:type/:id      -> upsert one entry (body = the item)
//   DELETE /api/data/:type/:id      -> remove one entry
//
// `:type` must be one of DATA_TYPES below — this is also the allowlist that
// keeps the endpoint from reading/writing anything outside src/data/.
// ============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Use import.meta.url (not __dirname) since this file is loaded as ESM —
// Vite's config bundler preserves import.meta.url correctly regardless of
// how it wraps the config module, unlike __dirname which is CJS-only.
const here = dirname(fileURLToPath(import.meta.url));

const DATA_TYPES = [
  'characters',
  'enemies',
  'gear',
  'abilities',
  'passives',
  'statuses',
  'parties',
  'enemyParties',
] as const;
type DataType = (typeof DATA_TYPES)[number];

function isDataType(value: string): value is DataType {
  return (DATA_TYPES as readonly string[]).includes(value);
}

function dataFilePath(type: DataType): string {
  return resolve(here, 'src', 'data', `${type}.json`);
}

function readMap(type: DataType): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(dataFilePath(type), 'utf-8'));
  } catch {
    return {};
  }
}

function writeMap(type: DataType, map: Record<string, unknown>): void {
  writeFileSync(dataFilePath(type), JSON.stringify(map, null, 2) + '\n');
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolvePromise(body));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

/** Matches "/api/data/:type" or "/api/data/:type/:id" (id may itself
 * contain no further slashes — entity ids in this app are always plain
 * snake_case tokens). Returns undefined if the URL isn't shaped like that. */
function parseDataUrl(url: string): { type: string; id?: string } | undefined {
  const path = url.split('?')[0];
  const match = /^\/api\/data\/([^/]+)(?:\/([^/]+))?\/?$/.exec(path);
  if (!match) return undefined;
  return { type: match[1], id: match[2] };
}

export function dataApiPlugin(): Plugin {
  return {
    name: 'battle-sim-data-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/data/')) return next();
        const parsed = parseDataUrl(req.url);
        if (!parsed || !isDataType(parsed.type)) {
          sendJson(res, 404, { error: 'unknown data type' });
          return;
        }
        const { type, id } = parsed;

        try {
          if (req.method === 'GET' && !id) {
            sendJson(res, 200, readMap(type));
            return;
          }

          if (req.method === 'PUT' && id) {
            const body = await readBody(req);
            const item = JSON.parse(body);
            const map = readMap(type);
            map[id] = item;
            writeMap(type, map);
            sendJson(res, 200, { ok: true });
            return;
          }

          if (req.method === 'DELETE' && id) {
            const map = readMap(type);
            delete map[id];
            writeMap(type, map);
            sendJson(res, 200, { ok: true });
            return;
          }

          sendJson(res, 405, { error: 'unsupported method/route' });
        } catch (err) {
          sendJson(res, 500, { error: err instanceof Error ? err.message : String(err) });
        }
      });
    },
  };
}
