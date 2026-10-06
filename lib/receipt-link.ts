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
// Short keys are a holdover from link format v1, which sent this object
// as JSON; see "Link format v2" below for what a link carries now.
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
  /** Tanggal acara as [from, to] day numbers (see toDayNumber) — what a
   * link carries instead of `ed`. Absent on snapshots read from old v1 links. */
  dd?: [number, number];
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
    dd: [toDayNumber(event.tanggalDari), toDayNumber(event.tanggalSampai)],
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

// Calendar day as a whole number of days since 1970, independent of the
// time zone the link is opened in.
function toDayNumber(date: Date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

function fromDayNumber(day: number) {
  const utc = new Date(day * 86400000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

// --- Link format v2 -------------------------------------------------
//
// "2" then the fields below joined by ".", e.g. `2.Jastip-by-Juli.877…`.
// About half the length of v1 (base64 of keyed JSON): no key names, no
// JSON punctuation, numbers in base 36, dates as day numbers, and text
// left readable instead of base64'd. Only A-Z a-z 0-9 and "-._~" ever
// appear, so chat apps link the whole thing and nothing needs
// percent-escaping.
//
//   nama jastip . telepon . printed-at (minutes) . nama acara .
//   date from . date to . nomor order . nama customer . alamat .
//   flags (lunas*4 + ongkir option index) . ongkir billed . total .
//   then per item: nama produk . jumlah . price per unit
const ONGKIR_CODES = [null, 'awal', 'saatPengiriman', 'gratis'] as const;
const HEADER_FIELDS = 12;

// Text: letters and digits as they are, space as "-", "-" as "_", and
// every other character as "~" + two hex digits per UTF-8 byte.
function escapeText(text: string) {
  let out = '';
  for (const byte of new TextEncoder().encode(text)) {
    const ch = String.fromCharCode(byte);
    if (/[A-Za-z0-9]/.test(ch)) out += ch;
    else if (ch === ' ') out += '-';
    else if (ch === '-') out += '_';
    else out += '~' + byte.toString(16).padStart(2, '0');
  }
  return out;
}

function unescapeText(escaped: string) {
  const bytes: number[] = [];
  for (let i = 0; i < escaped.length; i++) {
    const ch = escaped[i];
    if (ch === '~') {
      bytes.push(parseInt(escaped.slice(i + 1, i + 3), 16));
      i += 2;
    } else if (ch === '-') bytes.push(0x20);
    else if (ch === '_') bytes.push(0x2d);
    else bytes.push(ch.charCodeAt(0));
  }
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

const num = (n: number) => Math.max(0, Math.round(n)).toString(36);

export function encodeReceiptSnapshot(snapshot: ReceiptSnapshot) {
  const [from, to] = snapshot.dd ?? [0, 0];
  const fields = [
    escapeText(snapshot.nj),
    escapeText(snapshot.tj),
    num(snapshot.t / 60000),
    escapeText(snapshot.ea),
    num(from),
    num(to),
    escapeText(snapshot.on),
    escapeText(snapshot.cn),
    escapeText(snapshot.al),
    num((snapshot.lu ? 4 : 0) + Math.max(0, ONGKIR_CODES.indexOf(snapshot.ok))),
    num(snapshot.og),
    num(snapshot.tt),
    ...snapshot.it.flatMap(([nama, jumlah, harga]) => [escapeText(nama), num(jumlah), num(harga)]),
  ];
  return `2.${fields.join('.')}`;
}

function decodeV2(encoded: string): ReceiptSnapshot | null {
  const f = encoded.split('.').slice(1);
  if (f.length < HEADER_FIELDS || (f.length - HEADER_FIELDS) % 3 !== 0) return null;
  const int = (text: string) => parseInt(text, 36);
  const numbers = [f[2], f[4], f[5], f[9], f[10], f[11]].map(int);
  if (numbers.some(Number.isNaN)) return null;
  const [minutes, from, to, flags, og, tt] = numbers;

  const it: ReceiptSnapshot['it'] = [];
  for (let i = HEADER_FIELDS; i < f.length; i += 3) {
    const jumlah = int(f[i + 1]);
    const harga = int(f[i + 2]);
    if (Number.isNaN(jumlah) || Number.isNaN(harga)) return null;
    it.push([unescapeText(f[i]), jumlah, harga]);
  }

  return {
    v: 1,
    nj: unescapeText(f[0]),
    tj: unescapeText(f[1]),
    t: minutes * 60000,
    ea: unescapeText(f[3]),
    ed: formatDateRange(fromDayNumber(from), fromDayNumber(to)),
    dd: [from, to],
    on: unescapeText(f[6]),
    cn: unescapeText(f[7]),
    al: unescapeText(f[8]),
    lu: flags >= 4,
    ok: ONGKIR_CODES[flags % 4] ?? null,
    og,
    it,
    tt,
  };
}

// Link format v1: base64url of the snapshot as JSON. No longer produced,
// but links already sent to customers must keep opening.
function decodeV1(encoded: string): ReceiptSnapshot | null {
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
}

/** Returns null for anything that isn't a well-formed receipt link. */
export function decodeReceiptSnapshot(encoded: string): ReceiptSnapshot | null {
  try {
    return encoded.startsWith('2.') ? decodeV2(encoded) : decodeV1(encoded);
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
