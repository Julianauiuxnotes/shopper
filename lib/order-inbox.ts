import * as Crypto from 'expo-crypto';
import { rpc } from './backend';

// A jastiper's "inbox" for customer order-form submissions. With no user
// accounts, it works by capability: the device makes a random `secret`
// and derives a public `id` from it. The id goes into order-form links so
// customers can submit to it; only the secret can read what arrived.
// The same derivation is done server-side in
// supabase/migrations/0001_shopper_order_submissions.sql.
export type OrderInbox = { secret: string; id: string };

export async function createOrderInbox(): Promise<OrderInbox> {
  const bytes = await Crypto.getRandomBytesAsync(24);
  const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, secret);
  return { secret, id: hash.slice(0, 20) };
}

/** What a customer submits; the shape stored as the row's `payload`. */
export type SubmittedOrder = {
  nama: string;
  alamat: string;
  /** Local digits, without +62 */
  whatsapp: string;
  metodePengiriman: 'instant' | 'ekspedisi';
  items: Array<{ namaProduk: string; jumlah: number }>;
};

export type IncomingOrder = { id: string; kodeEvent: string; order: SubmittedOrder };

export async function submitOrder(inboxId: string, kodeEvent: string, order: SubmittedOrder) {
  await rpc<string>('shopper_submit_order', {
    p_inbox_id: inboxId,
    p_kode_event: kodeEvent,
    p_payload: order,
  });
}

// Rows come from a public form, so nothing about their contents is
// trusted: anything that isn't a well-formed order is dropped (and still
// acknowledged, so it doesn't come back on every fetch).
function toSubmittedOrder(payload: unknown): SubmittedOrder | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.nama !== 'string' || typeof p.alamat !== 'string') return null;
  if (typeof p.whatsapp !== 'string' || !Array.isArray(p.items)) return null;
  const items = p.items
    .filter(
      (it): it is { namaProduk: string; jumlah: number } =>
        !!it &&
        typeof (it as { namaProduk?: unknown }).namaProduk === 'string' &&
        typeof (it as { jumlah?: unknown }).jumlah === 'number'
    )
    .map((it) => ({
      namaProduk: it.namaProduk.slice(0, 200),
      jumlah: Math.min(999, Math.max(1, Math.round(it.jumlah))),
    }))
    .slice(0, 100);
  if (items.length === 0) return null;
  return {
    nama: p.nama.slice(0, 200),
    alamat: p.alamat.slice(0, 1000),
    whatsapp: p.whatsapp.replace(/\D/g, '').slice(0, 15),
    metodePengiriman: p.metodePengiriman === 'ekspedisi' ? 'ekspedisi' : 'instant',
    items,
  };
}

type Row = { id: string; kode_event: string; payload: unknown };

/** Everything waiting in the inbox, plus the ids of rows that were unreadable. */
export async function fetchIncomingOrders(inbox: OrderInbox) {
  const rows = await rpc<Row[]>('shopper_fetch_orders', { p_secret: inbox.secret });
  const orders: IncomingOrder[] = [];
  const invalidIds: string[] = [];
  for (const row of rows) {
    const order = toSubmittedOrder(row.payload);
    if (order) orders.push({ id: row.id, kodeEvent: row.kode_event, order });
    else invalidIds.push(row.id);
  }
  return { orders, invalidIds };
}

/** Tells the server these orders are saved on this device and can be removed. */
export async function ackIncomingOrders(inbox: OrderInbox, ids: string[]) {
  if (ids.length === 0) return;
  await rpc<number>('shopper_ack_orders', { p_secret: inbox.secret, p_ids: ids });
}
