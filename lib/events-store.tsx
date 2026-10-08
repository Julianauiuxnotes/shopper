import * as React from 'react';
import { addPendingDeletes } from './pending-deletes';
import { storage } from './storage';

// Persisted on-device via lib/storage.ts (AsyncStorage — localStorage on
// web, native storage on iOS/Android), same "no backend needed" local
// persistence as the separate Cashly project. TODO: migrate to Supabase
// once the backend (fymscirqwnnlubepymgc.supabase.co) is
// unpaused/reconnected — this is still single-device storage, not
// shared across a jastiper's own devices or with customers. This is the
// single source of truth for created jastip events (and now their
// orders), shared by the Dashboard (empty vs filled state, "List event
// jastip", aggregate stats), the Buka Event Jastip form (creates
// events), Event Detail (reads one by id, shows its real Pesanan/
// Revenue/Profit and order lists), and Tambah Pesanan (creates orders
// against an event).
//
// `tanggalDari`/`tanggalSampai` are real `Date` objects in memory but
// JSON can't round-trip those — persisted as ISO strings and revived
// back into `Date`s on load (see `reviveEvent` below). `fotoUri`/
// `fotoStruk` (picked via expo-image-picker) are also persisted as
// plain strings, but on web these are `blob:` URLs that only stay valid
// for the tab/session that created them — after a reload, a persisted
// photo's URI string survives but the image itself will fail to load
// (same limitation web's Blob URLs always have, not specific to this
// storage layer; native's `file://` URIs don't have this problem).

export type OrderItem = {
  id: string;
  namaProduk: string;
  jumlah: number;
  harga: number; // IDR per unit
  // The price as typed in the event's own currency, for Internasional
  // events; `harga` is this converted with the event's kurs at that time.
  hargaAsing?: number;
  // What the product cost at the event before the jastiper's own markup,
  // IDR per unit (and as typed, for Internasional events). The jastiper's
  // private note: its gap to `harga` counts as profit (getOrderProfit),
  // but it never changes the bill and nothing shown to a customer
  // (tagihan, receipt link, penanda) may include it.
  hargaAsli?: number;
  hargaAsliAsing?: number;
  feeType: 'percent' | 'flat';
  feeValue: number; // percent (0-100) if feeType 'percent', else flat IDR per unit
  dibeli: boolean; // "sudah dibeli" — purchased by the jastiper yet
  fotoStruk: string | null; // local file:// URI of the receipt photo, set on confirm
};

export type PaymentStatus = 'lunas' | 'belumLunas' | 'belum';

export type Order = {
  id: string;
  orderNumber: string; // ORD-0001, per-event sequence (memory: normalize to 4-digit padding)
  // When the order was entered (ISO). Absent on orders from before the
  // field existed.
  dibuat?: string;
  nama: string;
  alamat: string;
  whatsapp: string;
  metodePengiriman: 'instant' | 'ekspedisi';
  // Who pays the delivery fee and when. 'awal' = billed upfront, so
  // `ongkir` is added to what the customer owes; 'saatPengiriman' = the
  // customer pays the courier on delivery, so it stays out of the bill;
  // 'gratis' = free ongkir, nothing is charged to the customer for it.
  // Optional because orders saved before this field existed don't have it.
  pembayaranOngkir?: 'awal' | 'saatPengiriman' | 'gratis' | null;
  ongkir?: number; // IDR, only meaningful when pembayaranOngkir is 'awal'
  items: OrderItem[];
  totalPembayaran: number;
  profit: number;
  // 'belumLunas' = the customer has paid part of it (a DP or any partial
  // payment); 'belum' = nothing paid yet.
  statusPembayaran: PaymentStatus;
  // Down payment already received, IDR. Optional: absent or 0 = none.
  dp?: number;
  // 'customer' = arrived through the public order form (app/o.tsx), so its
  // prices and fees haven't been filled in by the jastiper yet. Absent on
  // orders the jastiper entered in Tambah Pesanan.
  sumber?: 'customer';
};

/**
 * What the customer owes for an order: goods + jastip fee, plus ongkir
 * when it's billed upfront ("Bayar ongkir di awal"). Same figure as
 * Order Detail's "Total tagihan ke pelanggan".
 */
export function getTotalTagihan(order: Order) {
  const ongkir = order.pembayaranOngkir === 'awal' ? (order.ongkir ?? 0) : 0;
  return order.totalPembayaran + order.profit + ongkir;
}

/**
 * The jastiper's markup on one line: (harga ke pelanggan - harga asli) x
 * jumlah, 0 when no harga asli was noted. Negative if sold below cost.
 */
export function getItemMarkup(item: Pick<OrderItem, 'harga' | 'hargaAsli' | 'jumlah'>) {
  return item.hargaAsli ? (item.harga - item.hargaAsli) * item.jumlah : 0;
}

/**
 * What the jastiper earns on an order: the jastip fees (`order.profit`)
 * plus the markup over harga asli. The markup is already inside the
 * price the customer pays, so it is NOT added to the bill — only the
 * fees are (see getTotalTagihan).
 */
export function getOrderProfit(order: Order) {
  return order.profit + order.items.reduce((sum, item) => sum + getItemMarkup(item), 0);
}

/** An event's profit: fees plus markup, over all its orders. */
export function getEventProfit(event: JastipEvent) {
  return event.orders.reduce((sum, order) => sum + getOrderProfit(order), 0);
}

/** What the customer still owes: nothing once Lunas, else the bill less the DP. */
export function getSisaPembayaran(order: Order) {
  if (order.statusPembayaran === 'lunas') return 0;
  return Math.max(0, getTotalTagihan(order) - (order.dp ?? 0));
}

// Something the jastiper spent at an event (parking, packaging, ...).
export type Expense = {
  id: string;
  nama: string;
  // ISO date the money was spent; absent on entries from before the field.
  tanggal?: string;
  jumlah: number;
};

export type JastipEvent = {
  id: string;
  kodeEvent: string;
  namaAcara: string;
  tanggalDari: Date;
  tanggalSampai: Date;
  lokasi: string;
  fotoUri: string | null;
  // How much the jastiper plans to spend at this event, IDR. Optional:
  // absent on events created before the field existed, 0 when left empty.
  budget?: number;
  // Lokal = priced in IDR. Internasional = prices are typed in `mataUang`
  // and converted to IDR with `kurs` (IDR per 1 unit). Absent = Lokal.
  jenis?: 'lokal' | 'internasional';
  mataUang?: string;
  kurs?: number;
  // The event's own costs, listed on its Laporan tab. Absent when none.
  pengeluaran?: Expense[];
  orders: Order[];
  // Derived from `orders` — kept as plain fields (not computed on read)
  // so Dashboard's aggregate sums stay a simple reduce over events.
  totalOrder: number;
  revenue: number;
  profit: number;
};

type NewEventInput = {
  namaAcara: string;
  tanggalDari: Date;
  tanggalSampai: Date;
  lokasi: string;
  fotoUri: string | null;
  budget?: number;
  jenis?: 'lokal' | 'internasional';
  mataUang?: string;
  kurs?: number;
};

type NewOrderInput = {
  nama: string;
  alamat: string;
  whatsapp: string;
  metodePengiriman: 'instant' | 'ekspedisi';
  items: Array<Omit<OrderItem, 'id' | 'dibeli' | 'fotoStruk'>>;
  /** Down payment already received, IDR. */
  dp?: number;
  sumber?: 'customer';
};

type EventsContextValue = {
  events: JastipEvent[];
  /** True once the saved events have loaded from storage. */
  ready: boolean;
  // Wipes every event and order and restarts the code sequences. Called
  // when a new account signs up: this store is per-device, not per
  // account, so without it a brand-new user would inherit whatever the
  // device's previous account (or earlier testing) left behind.
  resetEvents: () => void;
  // For lib/sync.ts: replaces the whole list after merging in changes
  // pulled from the server (or re-keying local data before the first sync).
  replaceEvents: (updater: (prev: JastipEvent[]) => JastipEvent[]) => void;
  addEvent: (input: NewEventInput) => JastipEvent;
  updateEvent: (id: string, input: NewEventInput) => void;
  addExpense: (eventId: string, input: Omit<Expense, 'id'>) => void;
  deleteExpense: (eventId: string, expenseId: string) => void;
  // Permanently remove an event (with all its orders) or one order. The
  // deletion is also queued for the server (lib/pending-deletes.ts), so it
  // disappears on the shop's other devices too.
  deleteEvent: (eventId: string) => void;
  deleteOrder: (eventId: string, orderId: string) => void;
  // Replaces an order with an edited copy (Order Detail's "Simpan") and
  // recomputes the event's count, revenue and profit from its orders.
  saveOrder: (eventId: string, order: Order) => void;
  getEvent: (id: string) => JastipEvent | undefined;
  addOrder: (eventId: string, input: NewOrderInput) => Order | undefined;
  getOrder: (eventId: string, orderId: string) => Order | undefined;
  // Generic order mutator (status pembayaran, metode pengiriman, per-item
  // `dibeli` toggling, Nama/Alamat/No. Whatsapp — anything that doesn't
  // change totalPembayaran/profit, which stay fixed from creation).
  updateOrder: (eventId: string, orderId: string, updater: (order: Order) => Order) => void;
  // For edits that DO change an item's totals (namaProduk/jumlah/harga/
  // feeType/feeValue, from the "Sudah dibeli" confirm sheet) — unlike
  // updateOrder, this recomputes the delta via computeItemTotals and
  // applies it to both the order's totalPembayaran/profit AND the
  // event's revenue/profit, keeping every aggregate in sync instead of
  // silently going stale.
  updateOrderItem: (
    eventId: string,
    orderId: string,
    itemId: string,
    updates: Partial<Omit<OrderItem, 'id'>>
  ) => void;
  // Adds a new item to an already-submitted order (Order Detail's own
  // "+Tambah list pesanan" sheet) — unlike addOrder's own item
  // construction (new order, fresh totals), this adds ONE item to an
  // EXISTING order and applies its subtotal/fee onto the order's
  // totalPembayaran/profit AND the event's revenue/profit, same
  // aggregate-sync principle as updateOrderItem.
  addOrderItem: (eventId: string, orderId: string, item: Omit<OrderItem, 'id'>) => void;
};

const EventsContext = React.createContext<EventsContextValue | null>(null);

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

// JSON.parse doesn't revive Date strings on its own — reconstructs the
// two date fields after loading a persisted event back from storage.
function reviveEvent(e: JastipEvent): JastipEvent {
  return { ...e, tanggalDari: new Date(e.tanggalDari), tanggalSampai: new Date(e.tanggalSampai) };
}

// Ids for new events and orders. Random rather than derived from the
// display code (DRM-…/ORD-…), because codes are numbered per device: two
// devices of the same shop can both produce "ORD-0003", and on the server
// those must stay two different orders, not overwrite each other.
export function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** An event's order count, revenue and profit, recomputed from its orders. */
export function withTotals(event: JastipEvent): JastipEvent {
  return {
    ...event,
    totalOrder: event.orders.length,
    revenue: event.orders.reduce((sum, o) => sum + o.totalPembayaran, 0),
    profit: event.orders.reduce((sum, o) => sum + o.profit, 0),
  };
}

// The number at the end of a display code ("ORD-0012" -> 12, and the last
// three digits of "DRM-0710004" -> 4); 0 when there isn't one.
function trailingNumber(code: string, digits: number) {
  const match = code.match(new RegExp(`(\\d{1,${digits}})$`));
  return match ? Number(match[1]) : 0;
}

export function computeItemTotals(
  item: Pick<OrderItem, 'harga' | 'jumlah' | 'feeType' | 'feeValue'>
) {
  const subtotal = item.harga * item.jumlah;
  const fee =
    item.feeType === 'percent' ? subtotal * (item.feeValue / 100) : item.feeValue * item.jumlah;
  return { subtotal, fee };
}

// DRM-<DDMM of start date><sequence> for events (memory: doremi-project's
// "DRM-0406001" convention), ORD-<sequence, 4 digits> per event for
// orders. Refs (not state) for the sequence counters so they're always
// correct synchronously, even if called again before a re-render. The
// next number is the higher of this device's counter and the highest
// code already in the data, so numbering carries on correctly after
// events and orders arrive from other devices. Two devices can still
// produce the same code if both create one before syncing; the ids
// (newId) keep those apart. Server-assigned numbers are a later step.
function EventsProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = React.useState<JastipEvent[]>([]);
  const [ready, setReady] = React.useState(false);
  const eventSeqRef = React.useRef(0);
  const orderSeqRef = React.useRef<Map<string, number>>(new Map());

  // Load once on mount; `ready` then unblocks the save effect below so it
  // can't fire on this initial (empty) state and clobber what was just
  // loaded. Sequence counters are refs (not state), so they're persisted
  // directly at their own mutation points in addEvent/addOrder instead
  // of through a react effect.
  React.useEffect(() => {
    (async () => {
      const savedEvents = await storage.get<JastipEvent[]>('events', []);
      const savedEventSeq = await storage.get('eventSeq', 0);
      const savedOrderSeq = await storage.get<Array<[string, number]>>('orderSeq', []);
      setEvents(savedEvents.map(reviveEvent));
      eventSeqRef.current = savedEventSeq;
      orderSeqRef.current = new Map(savedOrderSeq);
      setReady(true);
    })();
  }, []);

  React.useEffect(() => {
    if (ready) storage.set('events', events);
  }, [events, ready]);

  const addEvent = React.useCallback(
    (input: NewEventInput): JastipEvent => {
      const highest = Math.max(0, ...events.map((e) => trailingNumber(e.kodeEvent, 3)));
      eventSeqRef.current = Math.max(eventSeqRef.current, highest) + 1;
      storage.set('eventSeq', eventSeqRef.current);
      const ddmm = `${pad2(input.tanggalDari.getDate())}${pad2(input.tanggalDari.getMonth() + 1)}`;
      const kodeEvent = `DRM-${ddmm}${String(eventSeqRef.current).padStart(3, '0')}`;
      const created: JastipEvent = {
        id: newId('e'),
        kodeEvent,
        orders: [],
        totalOrder: 0,
        revenue: 0,
        profit: 0,
        ...input,
      };
      setEvents((prev) => [...prev, created]);
      return created;
    },
    [events]
  );

  // Edits an event's own details; its code, orders and expenses stay.
  const updateEvent = React.useCallback((id: string, input: NewEventInput) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...input } : e)));
  }, []);

  const getEvent = React.useCallback((id: string) => events.find((e) => e.id === id), [events]);

  const addOrder = React.useCallback(
    (eventId: string, input: NewOrderInput): Order | undefined => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return undefined;

      const highest = Math.max(0, ...event.orders.map((o) => trailingNumber(o.orderNumber, 4)));
      const nextSeq = Math.max(orderSeqRef.current.get(eventId) ?? 0, highest) + 1;
      orderSeqRef.current.set(eventId, nextSeq);
      storage.set('orderSeq', Array.from(orderSeqRef.current.entries()));
      const orderNumber = `ORD-${String(nextSeq).padStart(4, '0')}`;

      const orderId = newId('o');
      let totalPembayaran = 0;
      let profit = 0;
      const items: OrderItem[] = input.items.map((item, index) => {
        const { subtotal, fee } = computeItemTotals(item);
        totalPembayaran += subtotal;
        profit += fee;
        return { ...item, id: `${orderId}-${index}`, dibeli: false, fotoStruk: null };
      });

      const order: Order = {
        id: orderId,
        orderNumber,
        dibuat: new Date().toISOString(),
        nama: input.nama,
        alamat: input.alamat,
        whatsapp: input.whatsapp,
        metodePengiriman: input.metodePengiriman,
        items,
        totalPembayaran,
        profit,
        statusPembayaran: input.dp ? 'belumLunas' : 'belum',
        ...(input.dp ? { dp: input.dp } : {}),
        ...(input.sumber ? { sumber: input.sumber } : {}),
      };

      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                orders: [...e.orders, order],
                totalOrder: e.totalOrder + 1,
                revenue: e.revenue + totalPembayaran,
                profit: e.profit + profit,
              }
            : e
        )
      );

      return order;
    },
    [events]
  );

  const getOrder = React.useCallback(
    (eventId: string, orderId: string) =>
      events.find((e) => e.id === eventId)?.orders.find((o) => o.id === orderId),
    [events]
  );

  const updateOrder = React.useCallback(
    (eventId: string, orderId: string, updater: (order: Order) => Order) => {
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, orders: e.orders.map((o) => (o.id === orderId ? updater(o) : o)) }
            : e
        )
      );
    },
    []
  );

  const updateOrderItem = React.useCallback(
    (eventId: string, orderId: string, itemId: string, updates: Partial<Omit<OrderItem, 'id'>>) => {
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          const order = e.orders.find((o) => o.id === orderId);
          const item = order?.items.find((it) => it.id === itemId);
          if (!order || !item) return e;

          const before = computeItemTotals(item);
          const updatedItem: OrderItem = { ...item, ...updates };
          const after = computeItemTotals(updatedItem);
          const subtotalDelta = after.subtotal - before.subtotal;
          const feeDelta = after.fee - before.fee;

          return {
            ...e,
            revenue: e.revenue + subtotalDelta,
            profit: e.profit + feeDelta,
            orders: e.orders.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    items: o.items.map((it) => (it.id === itemId ? updatedItem : it)),
                    totalPembayaran: o.totalPembayaran + subtotalDelta,
                    profit: o.profit + feeDelta,
                  }
                : o
            ),
          };
        })
      );
    },
    []
  );

  const addOrderItem = React.useCallback(
    (eventId: string, orderId: string, item: Omit<OrderItem, 'id'>) => {
      setEvents((prev) =>
        prev.map((e) => {
          if (e.id !== eventId) return e;
          const order = e.orders.find((o) => o.id === orderId);
          if (!order) return e;

          const { subtotal, fee } = computeItemTotals(item);
          const newItem: OrderItem = { ...item, id: `${order.id}-${order.items.length}` };

          return {
            ...e,
            revenue: e.revenue + subtotal,
            profit: e.profit + fee,
            orders: e.orders.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    items: [...o.items, newItem],
                    totalPembayaran: o.totalPembayaran + subtotal,
                    profit: o.profit + fee,
                  }
                : o
            ),
          };
        })
      );
    },
    []
  );

  const resetEvents = React.useCallback(() => {
    eventSeqRef.current = 0;
    orderSeqRef.current = new Map();
    storage.set('eventSeq', 0);
    storage.set('orderSeq', []);
    setEvents([]);
  }, []);

  const deleteEvent = React.useCallback(
    (eventId: string) => {
      const event = events.find((e) => e.id === eventId);
      if (!event) return;
      addPendingDeletes({
        events: [eventId],
        orders: event.orders.map((o) => `${eventId}/${o.id}`),
      });
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    },
    [events]
  );

  const deleteOrder = React.useCallback((eventId: string, orderId: string) => {
    addPendingDeletes({ orders: [`${eventId}/${orderId}`] });
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? withTotals({ ...e, orders: e.orders.filter((o) => o.id !== orderId) })
          : e
      )
    );
  }, []);

  const saveOrder = React.useCallback((eventId: string, order: Order) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? withTotals({ ...e, orders: e.orders.map((o) => (o.id === order.id ? order : o)) })
          : e
      )
    );
  }, []);

  const addExpense = React.useCallback((eventId: string, input: Omit<Expense, 'id'>) => {
    const created: Expense = { id: newId('x'), ...input };
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId ? { ...e, pengeluaran: [...(e.pengeluaran ?? []), created] } : e
      )
    );
  }, []);

  const deleteExpense = React.useCallback((eventId: string, expenseId: string) => {
    setEvents((prev) =>
      prev.map((e) => {
        if (e.id !== eventId) return e;
        const rest = (e.pengeluaran ?? []).filter((x) => x.id !== expenseId);
        return { ...e, pengeluaran: rest.length > 0 ? rest : undefined };
      })
    );
  }, []);

  const replaceEvents = React.useCallback(
    (updater: (prev: JastipEvent[]) => JastipEvent[]) => setEvents(updater),
    []
  );

  const value = React.useMemo(
    () => ({
      ready,
      resetEvents,
      replaceEvents,
      deleteEvent,
      deleteOrder,
      saveOrder,
      events,
      addEvent,
      updateEvent,
      addExpense,
      deleteExpense,
      getEvent,
      addOrder,
      getOrder,
      updateOrder,
      updateOrderItem,
      addOrderItem,
    }),
    [
      events,
      ready,
      resetEvents,
      replaceEvents,
      deleteEvent,
      deleteOrder,
      saveOrder,
      addEvent,
      updateEvent,
      addExpense,
      deleteExpense,
      getEvent,
      addOrder,
      getOrder,
      updateOrder,
      updateOrderItem,
      addOrderItem,
    ]
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

function useEvents() {
  const ctx = React.useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used within an EventsProvider');
  return ctx;
}

export { EventsProvider, useEvents };
