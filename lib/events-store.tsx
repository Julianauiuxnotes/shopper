import * as React from 'react';
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
  feeType: 'percent' | 'flat';
  feeValue: number; // percent (0-100) if feeType 'percent', else flat IDR per unit
  dibeli: boolean; // "sudah dibeli" — purchased by the jastiper yet
  fotoStruk: string | null; // local file:// URI of the receipt photo, set on confirm
};

export type Order = {
  id: string;
  orderNumber: string; // ORD-0001, per-event sequence (memory: normalize to 4-digit padding)
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
  statusPembayaran: 'lunas' | 'belum';
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

export type JastipEvent = {
  id: string;
  kodeEvent: string;
  namaAcara: string;
  tanggalDari: Date;
  tanggalSampai: Date;
  lokasi: string;
  fotoUri: string | null;
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
};

type NewOrderInput = {
  nama: string;
  alamat: string;
  whatsapp: string;
  metodePengiriman: 'instant' | 'ekspedisi';
  items: Array<Omit<OrderItem, 'id' | 'dibeli' | 'fotoStruk'>>;
};

type EventsContextValue = {
  events: JastipEvent[];
  addEvent: (input: NewEventInput) => JastipEvent;
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
// correct synchronously, even if called again before a re-render.
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

  const addEvent = React.useCallback((input: NewEventInput): JastipEvent => {
    eventSeqRef.current += 1;
    storage.set('eventSeq', eventSeqRef.current);
    const ddmm = `${pad2(input.tanggalDari.getDate())}${pad2(input.tanggalDari.getMonth() + 1)}`;
    const kodeEvent = `DRM-${ddmm}${String(eventSeqRef.current).padStart(3, '0')}`;
    const created: JastipEvent = {
      id: kodeEvent,
      kodeEvent,
      orders: [],
      totalOrder: 0,
      revenue: 0,
      profit: 0,
      ...input,
    };
    setEvents((prev) => [...prev, created]);
    return created;
  }, []);

  const getEvent = React.useCallback((id: string) => events.find((e) => e.id === id), [events]);

  const addOrder = React.useCallback(
    (eventId: string, input: NewOrderInput): Order | undefined => {
      if (!events.some((e) => e.id === eventId)) return undefined;

      const nextSeq = (orderSeqRef.current.get(eventId) ?? 0) + 1;
      orderSeqRef.current.set(eventId, nextSeq);
      storage.set('orderSeq', Array.from(orderSeqRef.current.entries()));
      const orderNumber = `ORD-${String(nextSeq).padStart(4, '0')}`;

      let totalPembayaran = 0;
      let profit = 0;
      const items: OrderItem[] = input.items.map((item, index) => {
        const { subtotal, fee } = computeItemTotals(item);
        totalPembayaran += subtotal;
        profit += fee;
        return { ...item, id: `${orderNumber}-${index}`, dibeli: false, fotoStruk: null };
      });

      const order: Order = {
        id: orderNumber,
        orderNumber,
        nama: input.nama,
        alamat: input.alamat,
        whatsapp: input.whatsapp,
        metodePengiriman: input.metodePengiriman,
        items,
        totalPembayaran,
        profit,
        statusPembayaran: 'belum',
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

  const value = React.useMemo(
    () => ({
      events,
      addEvent,
      getEvent,
      addOrder,
      getOrder,
      updateOrder,
      updateOrderItem,
      addOrderItem,
    }),
    [events, addEvent, getEvent, addOrder, getOrder, updateOrder, updateOrderItem, addOrderItem]
  );

  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

function useEvents() {
  const ctx = React.useContext(EventsContext);
  if (!ctx) throw new Error('useEvents must be used within an EventsProvider');
  return ctx;
}

export { EventsProvider, useEvents };
