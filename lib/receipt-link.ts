import { computeItemTotals, getTotalTagihan, type JastipEvent, type Order } from './events-store';
import { formatDateRange } from './format';
import {
  escapeText,
  fromDayNumber,
  num,
  publicBaseUrl,
  toDayNumber,
  unescapeText,
} from './link-codec';

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
  /** Partly paid ("Belum lunas")? Absent on links from before the status existed. */
  bl?: boolean;
  /** DP already paid, IDR (0 = none). Absent on older links. */
  dp?: number;
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
    bl: order.statusPembayaran === 'belumLunas',
    dp: order.dp ?? 0,
    ok: order.pembayaranOngkir ?? null,
    og: order.pembayaranOngkir === 'awal' ? (order.ongkir ?? 0) : 0,
    // Products marked Tidak tersedia aren't billed, so they're left off.
    it: order.items
      .filter((item) => !item.tidakTersedia)
      .map((item) => {
        const { fee } = computeItemTotals(item);
        // Same "price already includes the jastip fee" per-unit figure as
        // app/cetak-penanda.tsx.
        return [item.namaProduk, item.jumlah, Math.round(item.harga + fee / item.jumlah)];
      }),
    tt: getTotalTagihan(order),
  };
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
//   flags (lunas*4 + belum-lunas*8 + ongkir option index) . ongkir billed .
//   total . [format 3 only: DP paid] .
//   then per item: nama produk . jumlah . price per unit
//
// Format "3" is the same with the DP added after the total; "2" links
// already sent to customers still open.
const ONGKIR_CODES = [null, 'awal', 'saatPengiriman', 'gratis'] as const;
const HEADER_FIELDS = 12;

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
    num(
      (snapshot.lu ? 4 : 0) + (snapshot.bl ? 8 : 0) + Math.max(0, ONGKIR_CODES.indexOf(snapshot.ok))
    ),
    num(snapshot.og),
    num(snapshot.tt),
    num(snapshot.dp ?? 0),
    ...snapshot.it.flatMap(([nama, jumlah, harga]) => [escapeText(nama), num(jumlah), num(harga)]),
  ];
  return `3.${fields.join('.')}`;
}

function decodeV2(encoded: string): ReceiptSnapshot | null {
  const f = encoded.split('.').slice(1);
  // Format 3 carries one more header field than 2: the DP.
  const header = encoded.startsWith('3.') ? HEADER_FIELDS + 1 : HEADER_FIELDS;
  if (f.length < header || (f.length - header) % 3 !== 0) return null;
  const int = (text: string) => parseInt(text, 36);
  const numbers = [f[2], f[4], f[5], f[9], f[10], f[11]].map(int);
  if (numbers.some(Number.isNaN)) return null;
  const [minutes, from, to, flags, og, tt] = numbers;
  const dp = header > HEADER_FIELDS ? int(f[12]) : 0;
  if (Number.isNaN(dp)) return null;

  const it: ReceiptSnapshot['it'] = [];
  for (let i = header; i < f.length; i += 3) {
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
    lu: (flags & 4) !== 0,
    bl: (flags & 8) !== 0,
    dp,
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
    return /^[23]\./.test(encoded) ? decodeV2(encoded) : decodeV1(encoded);
  } catch {
    return null;
  }
}

export function buildReceiptLink(snapshot: ReceiptSnapshot) {
  // In the #fragment, not the ?query: fragments are never sent to the
  // server, so the customer's name and address stay out of server logs.
  return `${publicBaseUrl()}/r#${encodeReceiptSnapshot(snapshot)}`;
}
