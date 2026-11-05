/**
 * The one source of truth for the demo: state lives in this Node process, every change goes through
 * `apply`, and subscribers (the SSE stream) hear about each new revision. Phones and laptops on the
 * same server all see the same state.
 *
 * Persistence: a JSON snapshot in `.data/state.json` (written at most every 500 ms), photos as JPEG
 * files in `.data/photos/`. Survives `next dev` reloads and server restarts. Set CURB_DATA_DIR to
 * move it; on a read-only filesystem it quietly runs in memory only.
 */
import fs from "node:fs";
import path from "node:path";
import { buildInitialState, ops, VERSION, type Store } from "@/lib/engine";

type Listener = (rev: number) => void;
interface Db { state: Store; rev: number; listeners: Set<Listener>; saveTimer?: ReturnType<typeof setTimeout>; ticker?: ReturnType<typeof setInterval>; lastTick: number }

const DIR = process.env.CURB_DATA_DIR || process.env.AURORA_DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "state.json");
const PHOTOS = path.join(DIR, "photos");
const TICK_MS = 3000;

const g = globalThis as unknown as { __curbDb?: Db };

function loadFromDisk(): Store | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as Store;
    return parsed.version === VERSION ? parsed : null;
  } catch {
    return null;
  }
}

function db(): Db {
  if (g.__curbDb) return g.__curbDb;
  const d: Db = { state: loadFromDisk() ?? buildInitialState(), rev: 1, listeners: new Set(), lastTick: Date.now() };
  g.__curbDb = d;
  d.ticker = setInterval(tick, TICK_MS);
  d.ticker.unref?.();
  return d;
}

function save(d: Db) {
  clearTimeout(d.saveTimer);
  d.saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DIR, { recursive: true });
      fs.writeFileSync(FILE + ".tmp", JSON.stringify(d.state));
      fs.renameSync(FILE + ".tmp", FILE);
    } catch { /* read-only filesystem: memory only */ }
  }, 500);
}

function publish(d: Db) {
  d.rev += 1;
  save(d);
  for (const l of d.listeners) l(d.rev);
}

export function snapshot(): { rev: number; state: Store } {
  const d = db();
  return { rev: d.rev, state: d.state };
}

/**
 * Run one engine op atomically: on a copy, so a thrown ActionError leaves state untouched.
 * Ops are synchronous, so two requests never interleave inside one.
 */
export function apply<K extends keyof typeof ops>(op: K, args: unknown[]): { rev: number; result: unknown } {
  const d = db();
  const next = structuredClone(d.state);
  const fn = ops[op] as (s: Store, ...a: unknown[]) => unknown;
  const result = fn(next, ...args);
  if (JSON.stringify(next) !== JSON.stringify(d.state)) {
    d.state = next;
    publish(d);
  }
  return { rev: d.rev, result };
}

export function reset() {
  const d = db();
  d.state = buildInitialState();
  mem.clear();
  try { fs.rmSync(PHOTOS, { recursive: true, force: true }); } catch { /* memory only */ }
  publish(d);
}

export function subscribe(l: Listener): () => void {
  const d = db();
  d.listeners.add(l);
  return () => d.listeners.delete(l);
}

function tick() {
  const d = db();
  const now = Date.now();
  const elapsed = now - d.lastTick;
  d.lastTick = now;
  if (!d.state.flags.autoSchedule && !d.state.flags.autoVerifier) return;
  try { apply("tick", [elapsed, now]); } catch { /* never let the scheduler crash the server */ }
}

// ---------------------------------------------------------------- photos
const mem = new Map<string, Buffer>();

export function savePhoto(id: string, jpg: Buffer) {
  mem.set(id, jpg);
  try {
    fs.mkdirSync(PHOTOS, { recursive: true });
    fs.writeFileSync(path.join(PHOTOS, `${id}.jpg`), jpg);
  } catch { /* memory only */ }
}

export function readPhoto(id: string): Buffer | null {
  if (!/^[a-z0-9_-]+$/i.test(id)) return null;
  const hit = mem.get(id);
  if (hit) return hit;
  try { return fs.readFileSync(path.join(PHOTOS, `${id}.jpg`)); } catch { return null; }
}
