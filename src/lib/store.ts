"use client";
/**
 * Browser side of the demo state. The server (src/server/db.ts) owns the state; this module mirrors
 * it over Server-Sent Events (/api/stream) and sends actions to /api/actions. Every phone and
 * laptop on the same server sees the same state live.
 */
import { useSyncExternalStore } from "react";
import { buildInitialState, CLIENT_OPS, type ClientOp, type OpArgs, type OpResult, type Store } from "./engine";

export type { Store, DemoFlags } from "./engine";
export type { Severity, AlertSource } from "./types";

type Snapshot = { rev: number; state: Store };

/** Rendered until the first server snapshot arrives (and during SSR). */
const PLACEHOLDER = buildInitialState(Date.parse("2026-11-09T15:00:00Z"));

let current: Snapshot | null = null;
let connected = false;
let source: EventSource | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Take a newer snapshot (from an action or photo response, or the stream). */
export function acceptSnapshot(snap: Snapshot) {
  if (current && snap.rev < current.rev && snap.state.now === current.state.now) return; // stale
  current = snap;
  notify();
}

function connect() {
  if (source || typeof window === "undefined") return;
  source = new EventSource("/api/stream");
  source.addEventListener("state", (e) => acceptSnapshot(JSON.parse((e as MessageEvent).data)));
  source.onopen = () => { connected = true; notify(); };
  source.onerror = () => { connected = false; notify(); }; // EventSource retries by itself
}

function subscribe(l: () => void) {
  connect();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useDemo(): Store {
  return useSyncExternalStore(subscribe, () => current?.state ?? PLACEHOLDER, () => PLACEHOLDER);
}

/** True once the first server state has arrived (avoids flashing placeholder data). */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => current !== null, () => false);
}

/** Live link to the server; false while it reconnects. */
export function useConnected(): boolean {
  return useSyncExternalStore(subscribe, () => connected, () => true);
}

/**
 * Never throws, so fire-and-forget calls from click handlers stay quiet: a rejected action (e.g. a
 * second tab already took the job) resolves to undefined and the next state update corrects the UI.
 */
async function send<K extends ClientOp>(op: K, args: OpArgs<K>): Promise<OpResult<K> | undefined> {
  try {
    const res = await fetch("/api/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ op, args }) });
    const body = await res.json().catch(() => null);
    if (!res.ok) { console.warn(`[store] ${op} rejected: ${body?.error ?? res.status}`); return undefined; }
    acceptSnapshot({ rev: body.rev, state: body.state });
    return body.result as OpResult<K>;
  } catch (e) {
    console.warn(`[store] ${op} failed: ${(e as Error).message}`);
    return undefined;
  }
}

type Actions = { [K in ClientOp]: (...args: OpArgs<K>) => Promise<OpResult<K> | undefined> } & { reset(): Promise<void> };

export const actions = Object.fromEntries(CLIENT_OPS.map((op) => [op, (...args: unknown[]) => send(op, args as never)])) as unknown as Actions;

actions.reset = async () => {
  const res = await fetch("/api/state", { method: "DELETE" });
  if (res.ok) { const snap = (await res.json()) as Snapshot; current = null; acceptSnapshot(snap); }
};
