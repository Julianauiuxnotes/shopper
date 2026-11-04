import { computeItemTotals, getTotalTagihan, type JastipEvent, type Order } from './events-store';
import { formatDateRange } from './format';
import { linkLanguageParam } from './i18n';
import {
  decimalsOf,
  getHomeCurrency,
  type HomeCurrency,
  isHomeCurrency,
  roundMoney,
} from './money';
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
  /** Jastiper's address ('' = none). Absent on links before format 6. */
  aj?: string;
  /** Where to transfer: [bank, nomor rekening, nama pemilik], up to 3.
   * Absent on links before format 6. */
  rk?: Array<[string, string, string]>;
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
  /** Items: [nama produk, jumlah, per-unit price incl. jastip fee,
   * tidak tersedia]. The 4th is absent on links from before format 5,
   * which left Tidak tersedia items out altogether. */
  it: Array<[string, number, number, boolean?]>;
  /** Total tagihan, in `cu` */
  tt: number;
  /** The shop's currency (lib/money.ts) every amount here is in. Absent on
   * links from before currencies, which are all IDR. */
  cu?: HomeCurrency;
};

export function buildReceiptSnapshot(
  event: JastipEvent,
  order: Order,
  jastiper: {
    namaJastip: string;
    telepon: string;
    alamat?: string;
    rekening?: Array<{ bank: string; nomor: string; nama: string }>;
  },
  printedAt: Date
): ReceiptSnapshot {
  return {
    v: 1,
    nj: jastiper.namaJastip,
    tj: jastiper.telepon,
    aj: jastiper.alamat ?? '',
    rk: (jastiper.rekening ?? []).map((r) => [r.bank, r.nomor, r.nama]),
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
    // Products marked Tidak tersedia stay on the receipt, marked as such,
    // so the customer sees why they aren't billed (getTotalTagihan
    // already leaves them out of the total).
    it: order.items.map((item) => {
      const { fee } = computeItemTotals(item);
      // Same "price already includes the jastip fee" per-unit figure as
      // app/cetak-penanda.tsx.
      return [
        item.namaProduk,
        item.jumlah,
        roundMoney(item.harga + fee / item.jumlah),
        !!item.tidakTersedia,
      ];
    }),
    tt: getTotalTagihan(order),
    cu: getHomeCurrency(),
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
//   total . [format 3+: DP paid] . [format 4+: currency] .
//   [format 6: alamat jastip . number of bank accounts . then per
//   account: bank . nomor . nama] .
//   then per item: nama produk . jumlah . price per unit .
//   [format 5+: tidak tersedia, 1 or 0]
//
// Format "3" adds the DP after the total. Format "4" adds the currency
// after that, and gives amounts in its smallest unit (cents for MYR, SGD
// and USD, since only whole numbers fit). Format "5" adds the Tidak
// tersedia flag to each item; earlier formats left those items out.
// Format "6" adds the jastiper's address and bank accounts after the
// currency.
// "2" and "3" links already sent to customers still open, as IDR.
const ONGKIR_CODES = [null, 'awal', 'saatPengiriman', 'gratis'] as const;
const HEADER_FIELDS = 12;

export function encodeReceiptSnapshot(snapshot: ReceiptSnapshot) {
  const [from, to] = snapshot.dd ?? [0, 0];
  const currency = snapshot.cu ?? 'IDR';
  const scale = 10 ** decimalsOf(currency);
  const amount = (value: number) => num(value * scale);
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
    amount(snapshot.og),
    amount(snapshot.tt),
    amount(snapshot.dp ?? 0),
    currency,
    escapeText(snapshot.aj ?? ''),
    num((snapshot.rk ?? []).length),
    ...(snapshot.rk ?? []).flatMap(([bank, nomor, nama]) => [
      escapeText(bank),
      escapeText(nomor),
      escapeText(nama),
    ]),
    ...snapshot.it.flatMap(([nama, jumlah, harga, tidakTersedia]) => [
      escapeText(nama),
      num(jumlah),
      amount(harga),
      tidakTersedia ? '1' : '0',
    ]),
  ];
  return `6.${fields.join('.')}`;
}

function decodeV2(encoded: string): ReceiptSnapshot | null {
  const f = encoded.split('.').slice(1);
  // Format 3 carries one more header field than 2 (the DP), formats 4
  // to 6 two more (the DP and the currency); format 6 then the address
  // and bank accounts. Format 5 and 6 items have a 4th field (Tidak
  // tersedia).
  const format = encoded[0];
  const withCurrency = format >= '4';
  let header = HEADER_FIELDS + (withCurrency ? 2 : format === '3' ? 1 : 0);
  const rk: NonNullable<ReceiptSnapshot['rk']> = [];
  let aj = '';
  if (format === '6') {
    if (f.length < header + 2) return null;
    aj = unescapeText(f[header]);
    const accounts = parseInt(f[header + 1], 36);
    if (Number.isNaN(accounts) || accounts > 3) return null;
    if (f.length < header + 2 + accounts * 3) return null;
    for (let i = 0; i < accounts; i++) {
      const at = header + 2 + i * 3;
      rk.push([unescapeText(f[at]), unescapeText(f[at + 1]), unescapeText(f[at + 2])]);
    }
    header += 2 + accounts * 3;
  }
  const perItem = format >= '5' ? 4 : 3;
  if (f.length < header || (f.length - header) % perItem !== 0) return null;
  if (withCurrency && !isHomeCurrency(f[13])) return null;
  const currency: HomeCurrency = withCurrency ? (f[13] as HomeCurrency) : 'IDR';
  const scale = 10 ** decimalsOf(currency);
  const int = (text: string) => parseInt(text, 36);
  const numbers = [f[2], f[4], f[5], f[9]].map(int);
  const amounts = [f[10], f[11]].map((text) => int(text) / scale);
  if ([...numbers, ...amounts].some(Number.isNaN)) return null;
  const [minutes, from, to, flags] = numbers;
  const [og, tt] = amounts;
  const dp = header > HEADER_FIELDS ? int(f[12]) / scale : 0;
  if (Number.isNaN(dp)) return null;

  const it: ReceiptSnapshot['it'] = [];
  for (let i = header; i < f.length; i += perItem) {
    const jumlah = int(f[i + 1]);
    const harga = int(f[i + 2]) / scale;
    if (Number.isNaN(jumlah) || Number.isNaN(harga)) return null;
    it.push([unescapeText(f[i]), jumlah, harga, perItem === 4 && f[i + 3] === '1']);
  }

  return {
    v: 1,
    nj: unescapeText(f[0]),
    tj: unescapeText(f[1]),
    aj,
    rk,
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
    cu: currency,
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
    return /^[2-6]\./.test(encoded) ? decodeV2(encoded) : decodeV1(encoded);
  } catch {
    return null;
  }
}

export function buildReceiptLink(snapshot: ReceiptSnapshot) {
  // In the #fragment, not the ?query: fragments are never sent to the
  // server, so the customer's name and address stay out of server logs.
  return `${publicBaseUrl()}/r${linkLanguageParam()}#${encodeReceiptSnapshot(snapshot)}`;
}
