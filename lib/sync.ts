import { type JastipEvent, newId, type Order, withTotals } from './events-store';
import { storage } from './storage';
import { supabase } from './supabase';

// Keeps a shop's events and orders the same on every device (step 2 of
// the accounts/plans/sync plan; server side in
// supabase/migrations/0003_shopper_events_and_orders.sql).
//
// The app is local-first: screens read and write lib/events-store.tsx as
// before, online or not. A sync pass then
//   1. pulls documents that changed on the server since the last pass and
//      merges them into the local list, and
//   2. pushes every local document that differs from what was last
//      synced.
// "What was last synced" is a snapshot per document, kept on the device.
// Comparing against it finds local changes without every screen having
// to report its edits, and tells a local edit (keep it, push it) apart
// from a stale local copy (replace it with the server's).
//
// Conflicts: per document, the last write to reach the server wins.
// Events and orders are separate documents, so people working on
// different orders never collide. Nothing is ever deleted by sync.
//
// Photos (an event's fotoUri, an item's fotoStruk) are device-local URIs
// and are left out of what's synced; a merge keeps this device's own.

type EventDoc = {
  kodeEvent: string;
  namaAcara: string;
  tanggalDari: string;
  tanggalSampai: string;
  lokasi: string;
};
type OrderDoc = Omit<Order, 'id'>;

// One stable text form per document: jsonb doesn't preserve key order, so
// a document read back from the server has to compare equal to the one
// that was sent.
function canon(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canon(v)}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

function eventDoc(event: JastipEvent): EventDoc {
  return {
    kodeEvent: event.kodeEvent,
    namaAcara: event.namaAcara,
    tanggalDari: new Date(event.tanggalDari).toISOString(),
    tanggalSampai: new Date(event.tanggalSampai).toISOString(),
    lokasi: event.lokasi,
  };
}

function orderDoc(order: Order): OrderDoc {
  const { id: _id, ...rest } = order;
  return { ...rest, items: order.items.map((item) => ({ ...item, fotoStruk: null })) };
}

const orderKey = (eventId: string, orderId: string) => `${eventId}/${orderId}`;

type SyncState = {
  shopId: string;
  /** Last synced form of each event, by id. */
  events: Record<string, string>;
  /** Last synced form of each order, by "eventId/orderId". */
  orders: Record<string, string>;
  /** Newest server_updated_at seen; the next pull asks for anything after it. */
  cursor: string | null;
  /** Whether this device's pre-sync data has been given unique ids. */
  rekeyed: boolean;
};

async function loadState(shopId: string): Promise<SyncState> {
  const saved = await storage.get<SyncState | null>('syncState', null);
  if (saved && saved.shopId === shopId) return saved;
  return { shopId, events: {}, orders: {}, cursor: null, rekeyed: false };
}

/** Forgets everything synced so far. Called when a different shop logs in on this device. */
export async function resetSyncState() {
  await storage.set('syncState', null);
}

// Data created before sync existed used the display code as its id
// ("DRM-0710001", "ORD-0001"). Those repeat across devices, so on the
// server two browsers' different events would land on the same row and
// one would overwrite the other. Before a device's first sync, anything
// it hasn't synced yet gets a unique id instead; the codes stay as they
// were, for display. Returns the old-id -> new-id tables, so the change
// can be applied to the list as a pure step.
function planRekey(events: JastipEvent[], state: SyncState) {
  const eventIds = new Map<string, string>();
  const orderIds = new Map<string, string>();
  for (const event of events) {
    if (!state.events[event.id]) eventIds.set(event.id, newId('e'));
    for (const order of event.orders) {
      const key = orderKey(event.id, order.id);
      if (!state.orders[key]) orderIds.set(key, newId('o'));
    }
  }
  return { eventIds, orderIds };
}

function applyRekey(events: JastipEvent[], plan: ReturnType<typeof planRekey>): JastipEvent[] {
  return events.map((event) => ({
    ...event,
    id: plan.eventIds.get(event.id) ?? event.id,
    orders: event.orders.map((order) => {
      const id = plan.orderIds.get(orderKey(event.id, order.id));
      if (!id) return order;
      return {
        ...order,
        id,
        items: order.items.map((item, index) => ({ ...item, id: `${id}-${index}` })),
      };
    }),
  }));
}

type EventRow = { id: string; data: EventDoc; server_updated_at: string };
type OrderRow = { event_id: string; id: string; data: OrderDoc; server_updated_at: string };

function unwrap<R extends { data: unknown; error: unknown }>(result: R) {
  if (result.error) throw result.error;
  return result.data as Extract<R, { error: null }>['data'];
}

// Re-read a little before the cursor: a row written by another device in
// the same instant as the previous pull could otherwise be skipped.
// Applying a row twice is harmless.
const OVERLAP_MS = 15_000;

function since(cursor: string | null) {
  return cursor ? new Date(new Date(cursor).getTime() - OVERLAP_MS).toISOString() : null;
}

function isValidEventDoc(data: unknown): data is EventDoc {
  const d = data as Partial<EventDoc> | null;
  return (
    !!d &&
    typeof d.kodeEvent === 'string' &&
    typeof d.namaAcara === 'string' &&
    typeof d.tanggalDari === 'string' &&
    typeof d.tanggalSampai === 'string' &&
    typeof d.lokasi === 'string'
  );
}

function isValidOrderDoc(data: unknown): data is OrderDoc {
  const d = data as Partial<OrderDoc> | null;
  return (
    !!d &&
    typeof d.orderNumber === 'string' &&
    typeof d.nama === 'string' &&
    Array.isArray(d.items) &&
    typeof d.totalPembayaran === 'number' &&
    typeof d.profit === 'number'
  );
}

type Snapshots = Pick<SyncState, 'events' | 'orders'>;

// Merges rows pulled from the server into a local list. Pure: `base` is
// the snapshots as they were before this pull, so running it again on a
// slightly newer list (see syncOnce) reaches the same decisions. A
// document that differs locally from its snapshot was edited here since
// the last sync and is left alone — the push sends it.
function mergeRows(
  prev: JastipEvent[],
  eventRows: EventRow[],
  orderRows: OrderRow[],
  base: Snapshots
) {
  const byId = new Map(prev.map((e) => [e.id, e]));
  const order = prev.map((e) => e.id);
  const seen: Snapshots = { events: {}, orders: {} };
  let changed = 0;

  for (const row of eventRows) {
    if (!isValidEventDoc(row.data)) continue;
    const remote = canon(row.data);
    const mine = byId.get(row.id);
    const local = mine ? canon(eventDoc(mine)) : null;
    if (local !== null && local !== remote && local !== base.events[row.id]) continue;
    seen.events[row.id] = remote;
    if (local === remote) continue;
    byId.set(row.id, {
      ...(mine ?? { id: row.id, fotoUri: null, orders: [], totalOrder: 0, revenue: 0, profit: 0 }),
      kodeEvent: row.data.kodeEvent,
      namaAcara: row.data.namaAcara,
      tanggalDari: new Date(row.data.tanggalDari),
      tanggalSampai: new Date(row.data.tanggalSampai),
      lokasi: row.data.lokasi,
    });
    if (!mine) order.push(row.id);
    changed += 1;
  }

  for (const row of orderRows) {
    if (!isValidOrderDoc(row.data)) continue;
    const event = byId.get(row.event_id);
    // Its event isn't on this device; nothing to attach the order to.
    if (!event) continue;
    const key = orderKey(row.event_id, row.id);
    const remote = canon(row.data);
    const mine = event.orders.find((o) => o.id === row.id);
    const local = mine ? canon(orderDoc(mine)) : null;
    if (local !== null && local !== remote && local !== base.orders[key]) continue;
    seen.orders[key] = remote;
    if (local === remote) continue;
    // Keep this device's receipt photos for the items it still has.
    const photos = new Map((mine?.items ?? []).map((item) => [item.id, item.fotoStruk]));
    const merged: Order = {
      ...row.data,
      id: row.id,
      items: row.data.items.map((item) => ({ ...item, fotoStruk: photos.get(item.id) ?? null })),
    };
    byId.set(row.event_id, {
      ...event,
      orders: mine
        ? event.orders.map((o) => (o.id === row.id ? merged : o))
        : [...event.orders, merged],
    });
    changed += 1;
  }

  const next = changed > 0 ? order.map((id) => withTotals(byId.get(id) as JastipEvent)) : prev;
  return { next, seen, changed };
}

export type SyncResult = { pulled: number; pushed: number };

/**
 * One sync pass. `getEvents` must return the list as of the latest
 * `replaceEvents` call; `replaceEvents` applies a pure step to it. Both
 * steps passed to it are safe to run against a list that has moved on a
 * little (the user typing during a sync). Throws when the server can't be
 * reached, leaving everything as it was for the next attempt.
 */
export async function syncOnce(
  shopId: string,
  getEvents: () => JastipEvent[],
  replaceEvents: (updater: (prev: JastipEvent[]) => JastipEvent[]) => void
): Promise<SyncResult> {
  const state = await loadState(shopId);

  if (!state.rekeyed) {
    const plan = planRekey(getEvents(), state);
    if (plan.eventIds.size > 0 || plan.orderIds.size > 0) {
      replaceEvents((prev) => applyRekey(prev, plan));
    }
    state.rekeyed = true;
    await storage.set('syncState', state);
  }

  // --- Pull ---------------------------------------------------------
  let eventQuery = supabase
    .from('shop_events')
    .select('id, data, server_updated_at')
    .order('server_updated_at');
  let orderQuery = supabase
    .from('shop_orders')
    .select('event_id, id, data, server_updated_at')
    .order('server_updated_at');
  const from = since(state.cursor);
  if (from) {
    eventQuery = eventQuery.gt('server_updated_at', from);
    orderQuery = orderQuery.gt('server_updated_at', from);
  }
  const eventRows = (unwrap(await eventQuery) ?? []) as EventRow[];
  const orderRows = (unwrap(await orderQuery) ?? []) as OrderRow[];

  let pulled = 0;
  if (eventRows.length > 0 || orderRows.length > 0) {
    const base: Snapshots = { events: { ...state.events }, orders: { ...state.orders } };
    const result = mergeRows(getEvents(), eventRows, orderRows, base);
    pulled = result.changed;
    if (pulled > 0) replaceEvents((prev) => mergeRows(prev, eventRows, orderRows, base).next);
    Object.assign(state.events, result.seen.events);
    Object.assign(state.orders, result.seen.orders);

    const newest = [...eventRows, ...orderRows].reduce(
      (max, row) => (row.server_updated_at > max ? row.server_updated_at : max),
      state.cursor ?? ''
    );
    if (newest) state.cursor = newest;
  }

  // --- Push ---------------------------------------------------------
  const current = getEvents();
  const eventsToPush: Array<{ shop_id: string; id: string; data: EventDoc }> = [];
  const ordersToPush: Array<{ shop_id: string; event_id: string; id: string; data: OrderDoc }> = [];
  const pending: Array<() => void> = [];

  for (const event of current) {
    const doc = eventDoc(event);
    const text = canon(doc);
    if (text !== state.events[event.id]) {
      eventsToPush.push({ shop_id: shopId, id: event.id, data: doc });
      pending.push(() => {
        state.events[event.id] = text;
      });
    }
    for (const order of event.orders) {
      const key = orderKey(event.id, order.id);
      const oDoc = orderDoc(order);
      const oText = canon(oDoc);
      if (oText !== state.orders[key]) {
        ordersToPush.push({ shop_id: shopId, event_id: event.id, id: order.id, data: oDoc });
        pending.push(() => {
          state.orders[key] = oText;
        });
      }
    }
  }

  if (eventsToPush.length > 0) {
    unwrap(
      await supabase
        .from('shop_events')
        .upsert(eventsToPush, { onConflict: 'shop_id,id' })
        .select('id')
    );
  }
  if (ordersToPush.length > 0) {
    unwrap(
      await supabase
        .from('shop_orders')
        .upsert(ordersToPush, { onConflict: 'shop_id,event_id,id' })
        .select('id')
    );
  }
  // Only now are the snapshots moved on: a failed push leaves them as
  // they were, so the same documents are sent again next time.
  for (const commit of pending) commit();

  await storage.set('syncState', state);
  return { pulled, pushed: eventsToPush.length + ordersToPush.length };
}
