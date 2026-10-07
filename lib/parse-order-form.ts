// Reads a customer's pasted order-form text (the free-text message a
// jastip customer sends over chat) into the Tambah Pesanan fields.
//
// There is no fixed template to rely on, so this is a best-effort reader
// of the common shape — "Label: value" lines plus a list of items:
//
//   Nama: Nadine
//   Alamat: Jl. Sriwijaya VI No. 17, Cimahi
//   No. WA: 0857 7085 71266
//   Pengiriman: JNE
//   Pesanan:
//   1. Nivea B1G1 x2
//   2. Lip matte cream shade 626 - 1 pcs
//
// Anything it can't place is simply left out; the jastiper reviews and
// fixes the filled form before confirming. Prices and fees are never
// read: those are the jastiper's own numbers, not the customer's.

export type ParsedOrderForm = {
  nama?: string;
  alamat?: string;
  /** Local digits, without the +62 / 62 / leading 0 */
  whatsapp?: string;
  metodePengiriman?: 'instant' | 'ekspedisi';
  items: Array<{ namaProduk: string; jumlah: number }>;
};

type Section = 'nama' | 'alamat' | 'whatsapp' | 'metode' | 'items' | 'jumlah' | 'other';

// Checked in order, against the label lowercased with punctuation
// removed. Item labels come before `nama` so "Nama produk" isn't read as
// the customer's name.
const LABELS: Array<[Section, RegExp]> = [
  ['jumlah', /^(jumlah|jml|qty|quantity|banyaknya)( (barang|produk|item|pesanan))?$/],
  [
    'items',
    /^((list|daftar|detail|rincian) )?(nama )?(pesanan|orderan|order|barang|produk|item|items|titipan|belanjaan)( (saya|nya|yang dipesan|jastip))?$/,
  ],
  [
    'whatsapp',
    /^(no|nomor|nomer|number)? ?(wa|whatsapp|whatsap|hp|handphone|telp|telepon|telpon|tlp|phone|kontak)( ?(wa|whatsapp|hp|aktif|penerima|yang bisa dihubungi))*$/,
  ],
  ['alamat', /^(alamat|address)( (lengkap|pengiriman|penerima|rumah|kirim|tujuan))*$/],
  [
    'metode',
    /^((metode|jasa|opsi|pilihan|via|jenis) )?(pengiriman|kirim|kurir|ekspedisi|expedisi|shipping|delivery)( (via|pakai|yang dipilih))?$/,
  ],
  [
    'nama',
    /^(nama|name|penerima|atas nama|an|pemesan)( (lengkap|penerima|pemesan|customer|pembeli|kamu))*$/,
  ],
];

const INSTANT = /instan|same ?day|go ?send|gojek|grab|lalamove|maxim|kurir toko|cod\b/i;
const EKSPEDISI =
  /eksp|exp|jne|j&t|jnt|si ?cepat|anter ?aja|ninja|tiki|pos\b|kargo|cargo|lion|wahana|id ?express|sap\b|reguler|regular|paxel/i;

const UNIT = '(?:pcs|pc|buah|bh|biji|box|pack|pak|pax|botol|btl|lusin|set|item|items|unit)';
const MAX_QTY = 999;

function normalizeLabel(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sectionForLabel(label: string): Section | null {
  const normalized = normalizeLabel(label);
  if (!normalized || normalized.length > 40) return null;
  for (const [section, pattern] of LABELS) if (pattern.test(normalized)) return section;
  return null;
}

// "1.", "1)", "-", "•", "*" and the like at the start of a list line.
function stripBullet(line: string) {
  return line.replace(/^\s*(?:\d{1,2}\s*[.)]\s+|[-–—•*·▪>]+\s*)/, '').trim();
}

function toLocalWhatsapp(value: string) {
  const digits = value.replace(/\D/g, '');
  const local = digits.replace(/^(?:62|0)+/, '');
  return local.length >= 8 && local.length <= 13 ? local : undefined;
}

function toMetode(value: string): ParsedOrderForm['metodePengiriman'] {
  if (INSTANT.test(value)) return 'instant';
  if (EKSPEDISI.test(value)) return 'ekspedisi';
  return undefined;
}

// A quantity is only read where the text marks it as one ("x2", "2 pcs",
// "- 2", "qty 2"). A bare trailing number is left in the name, since
// product names end in numbers all the time ("Nivea B1G1", "shade 626").
export function parseItemLine(raw: string): { namaProduk: string; jumlah: number } | null {
  const line = stripBullet(raw);
  if (!line) return null;

  const patterns: Array<[RegExp, (m: RegExpMatchArray) => [string, string]]> = [
    // "2x Nivea", "2 pcs Nivea"
    [new RegExp(`^(\\d{1,3})\\s*(?:x|×|${UNIT})\\.?\\s+(.+)$`, 'i'), (m) => [m[2], m[1]]],
    // "Nivea x2", "Nivea (x 2)", "Nivea qty: 2", "Nivea jumlah 2 pcs"
    [
      new RegExp(
        `^(.+?)[\\s,;:(\\-–]+(?:x|×|@|qty|jumlah|jml|sebanyak)\\s*[:=.]?\\s*(\\d{1,3})\\s*${UNIT}?\\)?\\.?$`,
        'i'
      ),
      (m) => [m[1], m[2]],
    ],
    // "Nivea 2 pcs", "Nivea - 2pcs", "Nivea (2 buah)", "Nivea 2x"
    [
      new RegExp(`^(.+?)[\\s,;:(\\-–]+(\\d{1,3})\\s*(?:x|×|${UNIT})\\)?\\.?$`, 'i'),
      (m) => [m[1], m[2]],
    ],
    // "Nivea (2)" — the format the app's own example form recommends
    [/^(.+?)\s*\((\d{1,3})\)\.?$/, (m) => [m[1], m[2]]],
    // "Nivea: 2", "Nivea - 2", "Nivea = 2"
    [/^(.+?)\s*[:=–]\s*(\d{1,3})$/, (m) => [m[1], m[2]]],
    [/^(.+?)\s+-\s*(\d{1,3})$/, (m) => [m[1], m[2]]],
  ];

  for (const [pattern, pick] of patterns) {
    const match = line.match(pattern);
    if (!match) continue;
    const [name, qty] = pick(match);
    const jumlah = Number(qty);
    const namaProduk = name.replace(/[\s,;:(\-–]+$/, '').trim();
    if (namaProduk && jumlah >= 1 && jumlah <= MAX_QTY) return { namaProduk, jumlah };
  }
  return { namaProduk: line, jumlah: 1 };
}

export function parseOrderForm(text: string): ParsedOrderForm {
  const result: ParsedOrderForm = { items: [] };
  const alamatLines: string[] = [];
  let section: Section | null = null;

  function addItems(rawValue: string) {
    // The example form's own hint, "[Nama produk (Jumlah)] contoh →",
    // when a customer fills the list in after it instead of replacing it.
    const value = rawValue.replace(/^\s*\[[^\]]*\]\s*(?:contoh\s*)?(?:→|->|=>|:)?\s*/i, '');
    // "List pesanan: Nivea x2, Lip cream x1" — several products after the
    // label, split on commas; a comma inside one of those names just
    // yields two rows to tidy up by hand.
    for (const part of value.split(/\s*[,;]\s*(?=\S)/)) {
      const item = parseItemLine(part);
      if (item) result.items.push(item);
    }
  }

  function take(target: Section, value: string) {
    if (!value) return;
    if (target === 'nama') result.nama ??= value;
    else if (target === 'alamat') alamatLines.push(value.replace(/[\s,]+$/, ''));
    else if (target === 'whatsapp') result.whatsapp ??= toLocalWhatsapp(value);
    else if (target === 'metode') result.metodePengiriman ??= toMetode(value);
    else if (target === 'items') addItems(value);
    else if (target === 'jumlah') {
      // "Nama produk: X" then "Jumlah: 2" as separate lines
      const jumlah = Number(value.replace(/\D/g, ''));
      const last = result.items[result.items.length - 1];
      if (last && jumlah >= 1 && jumlah <= MAX_QTY) last.jumlah = jumlah;
    }
  }

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      // A blank line ends a multi-line address, but not the item list.
      if (section === 'alamat') section = null;
      continue;
    }

    const labelled = stripBullet(line).match(/^([^:=]{1,40}?)\s*[:=]\s*(.*)$/);
    const labelSection = labelled ? sectionForLabel(labelled[1]) : null;
    if (labelled && labelSection) {
      section = labelSection;
      take(section, labelled[2].trim());
      continue;
    }

    // "Note: jangan lupa bubble wrap" and other labels this reader doesn't
    // know end the item list instead of becoming a product — unless the
    // value is just a number, which is an item written as "Payung: 2".
    if (section === 'items' && labelled && !/^\d{1,3}$/.test(labelled[2].trim())) {
      section = null;
      continue;
    }

    // A bare heading with no colon, e.g. "Pesanan" on its own line.
    const heading = sectionForLabel(stripBullet(line));
    if (heading === 'items') {
      section = 'items';
      continue;
    }

    // An unlabelled line belongs to whatever section is open: more of the
    // address, or the next item in the list.
    if (section === 'alamat') take(section, line);
    else if (section === 'items') {
      // One product per line here, so commas stay in the name ("Tas, hitam").
      const item = parseItemLine(line);
      if (item) result.items.push(item);
    }
  }

  if (alamatLines.length > 0) result.alamat = alamatLines.join(', ');
  return result;
}
