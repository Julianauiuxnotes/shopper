import { computeItemTotals, getTotalTagihan, type JastipEvent, type Order } from './events-store';
import { formatDateRange } from './format';

// A customer's bill frozen at one moment, small enough to travel inside
// a link. There is no backend yet (orders live only on the jastiper's
// device), so the public receipt page (app/r.tsx) can't look an order up
// — the link itself carries everything the receipt shows. That also
// means a sent link keeps showing what was billed at the time, even if
// the order is edited later. The jastiper's logo is left out: as a
// base64 image it would make the link tens of thousands of characters.
//
// Keys are one or two letters to keep the link short; `v` lets a future
// format change tell old links apart.
export type ReceiptSnapshot = {
  v: 1;
  /** Nama jastip */
  nj: string;
  /** Jastiper's phone, local digits ('' = none) */
  tj: string;
  /** Printed-at time, ms since epoch */
  t: number;
  /** Nama acara */
  ea: string;
  /** Tanggal acara, already formatted */
  ed: string;
  /** Nomor order */
  on: string;
  /** Nama customer */
  cn: string;
  /** Alamat */
  al: string;
  /** Lunas? */
  lu: boolean;
  /** Ticked ongkir option (see lib/ongkir.ts), or null */
  ok: 'awal' | 'saatPengiriman' | 'gratis' | null;
  /** Ongkir billed upfront, IDR (0 unless ok === 'awal') */
  og: number;
  /** Items: [nama produk, jumlah, per-unit price incl. jastip fee] */
  it: Array<[string, number, number]>;
  /** Total tagihan, IDR */
  tt: number;
};

export function buildReceiptSnapshot(
  event: JastipEvent,
  order: Order,
  jastiper: { namaJastip: string; telepon: string },
  printedAt: Date
): ReceiptSnapshot {
  return {
    v: 1,
    nj: jastiper.namaJastip,
    tj: jastiper.telepon,
    t: printedAt.getTime(),
    ea: event.namaAcara,
    ed: formatDateRange(event.tanggalDari, event.tanggalSampai),
    on: order.orderNumber,
    cn: order.nama,
    al: order.alamat,
    lu: order.statusPembayaran === 'lunas',
    ok: order.pembayaranOngkir ?? null,
    og: order.pembayaranOngkir === 'awal' ? (order.ongkir ?? 0) : 0,
    it: order.items.map((item) => {
      const { fee } = computeItemTotals(item);
      // Same "price already includes the jastip fee" per-unit figure as
      // app/cetak-penanda.tsx.
      return [item.namaProduk, item.jumlah, Math.round(item.harga + fee / item.jumlah)];
    }),
    tt: getTotalTagihan(order),
  };
}

// base64url of the UTF-8 JSON: safe inside a URL fragment without any
// percent-escaping, so the link survives being pasted through WhatsApp.
export function encodeReceiptSnapshot(snapshot: ReceiptSnapshot) {
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Returns null for anything that isn't a well-formed v1 snapshot. */
export function decodeReceiptSnapshot(encoded: string): ReceiptSnapshot | null {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    const ok =
      data &&
      data.v === 1 &&
      typeof data.nj === 'string' &&
      typeof data.on === 'string' &&
      typeof data.cn === 'string' &&
      typeof data.tt === 'number' &&
      Array.isArray(data.it) &&
      data.it.every(
        (it: unknown) =>
          Array.isArray(it) &&
          typeof it[0] === 'string' &&
          typeof it[1] === 'number' &&
          typeof it[2] === 'number'
      );
    return ok ? (data as ReceiptSnapshot) : null;
  } catch {
    return null;
  }
}

// Where the public receipt page lives. On web it's this same site (so it
// works from localhost and from GitHub Pages alike); a native build has
// no origin of its own, so it points at the deployed web app.
const DEPLOYED_WEB_URL = 'https://julianauiuxnotes.github.io/shopper';

export function buildReceiptLink(snapshot: ReceiptSnapshot) {
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin}${process.env.EXPO_PUBLIC_BASE_URL ?? ''}`
      : DEPLOYED_WEB_URL;
  // In the #fragment, not the ?query: fragments are never sent to the
  // server, so the customer's name and address stay out of server logs.
  return `${base}/r#${encodeReceiptSnapshot(snapshot)}`;
}
