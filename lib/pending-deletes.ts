import { storage } from './storage';

// Events and orders deleted on this device that the server hasn't been
// told about yet. lib/events-store.tsx adds to the list when something is
// deleted; lib/sync.ts sends each one as a "deleted" marker and then
// removes it from the list.
//
// Recorded explicitly, rather than inferred from "it was synced before
// and is gone now": if a device ever lost its saved list, that inference
// would delete everything on the server.
export type PendingDeletes = {
  /** Event ids */
  events: string[];
  /** "eventId/orderId" */
  orders: string[];
};

let cache: PendingDeletes | null = null;

async function load(): Promise<PendingDeletes> {
  cache ??= await storage.get<PendingDeletes>('pendingDeletes', { events: [], orders: [] });
  return cache;
}

export async function getPendingDeletes(): Promise<PendingDeletes> {
  const current = await load();
  return { events: [...current.events], orders: [...current.orders] };
}

export async function addPendingDeletes(added: Partial<PendingDeletes>) {
  const current = await load();
  cache = {
    events: [...new Set([...current.events, ...(added.events ?? [])])],
    orders: [...new Set([...current.orders, ...(added.orders ?? [])])],
  };
  await storage.set('pendingDeletes', cache);
}

export async function removePendingDeletes(sent: PendingDeletes) {
  const current = await load();
  cache = {
    events: current.events.filter((id) => !sent.events.includes(id)),
    orders: current.orders.filter((key) => !sent.orders.includes(key)),
  };
  await storage.set('pendingDeletes', cache);
}

/** Forgets every pending deletion. For when a different shop logs in on this device. */
export async function clearPendingDeletes() {
  cache = { events: [], orders: [] };
  await storage.set('pendingDeletes', cache);
}
