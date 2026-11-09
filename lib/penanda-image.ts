import type { ReceiptBlock } from './receipt-image';

// Cetak penanda (app/cetak-penanda.tsx) as 58 mm receipt blocks, for
// "Simpan foto receipt" (lib/receipt-image.ts).

export type PenandaReceipt = {
  /** Uploaded logo (data URL), or null to leave it out */
  logo: string | null;
  namaJastip: string;
  waktuCetakLabel: string;
  waktuCetak: string;
  cetakKeLabel: string;
  cetakKe: string;
  /** [label, value, bold value?] */
  rows: Array<[string, string, boolean?]>;
  listLabel: string;
  items: Array<{ nama: string; detail: string; checked: boolean }>;
  footnote: string;
};

export function penandaBlocks(r: PenandaReceipt): ReceiptBlock[] {
  return [
    { type: 'logo', src: r.logo },
    { type: 'center', text: r.namaJastip, size: 20, bold: true },
    { type: 'center', text: `${r.waktuCetakLabel} : ${r.waktuCetak}`, size: 16 },
    { type: 'space', height: 4 },
    { type: 'center', text: r.cetakKeLabel },
    { type: 'center', text: r.cetakKe, size: 24, bold: true },
    { type: 'dashed' },
    { type: 'rows', rows: r.rows },
    { type: 'dashed' },
    { type: 'title', text: r.listLabel },
    ...r.items.flatMap((item, i): ReceiptBlock[] => [
      ...(i > 0 ? [{ type: 'rule' } as const] : []),
      {
        type: 'item',
        name: item.nama,
        detail: item.detail,
        box: item.checked ? 'checked' : 'unchecked',
        bold: item.checked,
      },
    ]),
    { type: 'space', height: 4 },
    { type: 'text', text: r.footnote, size: 15 },
    { type: 'dashed' },
  ];
}
