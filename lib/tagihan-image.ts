import { formatPrintTimestamp } from './format';
import { t } from './i18n';
import { formatMoney } from './money';
import { ONGKIR_OPTIONS } from './ongkir';
import type { ReceiptSnapshot } from './receipt-link';
import type { ReceiptBlock } from './receipt-image';

// The customer's bill (components/tagihan-receipt.tsx) as 58 mm receipt
// blocks, for "Simpan foto tagihan" and "Cetak" on app/tagihan.tsx
// (lib/receipt-image.ts). Same content and order as the on-screen bill.
export function tagihanBlocks(s: ReceiptSnapshot, logo: string | null): ReceiptBlock[] {
  const money = (amount: number) => formatMoney(amount, s.cu ?? 'IDR');
  const ongkirOption = ONGKIR_OPTIONS.find((o) => o.value === s.ok);
  const unavailable = s.it.filter((item) => item[3]).length;
  const dp = s.dp ?? 0;
  const blocks: ReceiptBlock[] = [
    { type: 'logo', src: logo },
    { type: 'center', text: s.nj, size: 20, bold: true },
  ];
  if (s.tj) blocks.push({ type: 'center', text: `+62${s.tj}`, size: 16 });
  if (s.aj) blocks.push({ type: 'center', text: s.aj, size: 16 });
  blocks.push(
    { type: 'center', text: `${t('Waktu cetak')} : ${formatPrintTimestamp(new Date(s.t))}`, size: 16 },
    { type: 'dashed' },
    {
      type: 'rows',
      rows: [
        [t('Nama acara'), s.ea],
        [t('Tanggal acara'), s.ed],
        [t('Nomor order'), s.on, true],
        [t('Nama customer'), s.cn],
        [t('Alamat'), s.al],
        [
          t('Total pesanan'),
          t('{n} items', { n: s.it.length - unavailable }) +
            (unavailable > 0 ? ` (${t('{n} tidak tersedia', { n: unavailable })})` : ''),
        ],
        [t('Status pembayaran'), s.lu ? t('Lunas') : s.bl ? t('Belum lunas') : t('Belum bayar'), true],
      ],
    },
    { type: 'dashed' }
  );

  if (ongkirOption) {
    blocks.push(
      { type: 'title', text: t('Ongkos kirim') },
      {
        type: 'item',
        name: `${t('Ongkos kirim')} : ${t(ongkirOption.label)}`,
        detail: s.og > 0 ? money(s.og) : '',
        box: 'checked',
      },
      { type: 'space', height: 6 }
    );
  }

  blocks.push({ type: 'title', text: t('List pesanan') });
  s.it.forEach(([nama, jumlah, harga, tidakTersedia], i) => {
    if (i > 0) blocks.push({ type: 'rule' });
    blocks.push({
      type: 'item',
      name: nama,
      detail: `${jumlah}x  ${money(harga)}*`,
      box: tidakTersedia ? 'none' : 'checked',
      struck: !!tidakTersedia,
      note: tidakTersedia ? `${t('Tidak tersedia')} · ${t('Tidak ditagih')}` : undefined,
    });
  });
  blocks.push({ type: 'dashed' }, { type: 'amount', label: t('Total tagihan yang harus dibayar'), value: money(s.tt) });

  if (!s.lu && dp > 0) {
    blocks.push(
      { type: 'amount', label: t('DP sudah dibayar'), value: money(dp) },
      { type: 'amount', label: t('Sisa pembayaran'), value: money(Math.max(0, s.tt - dp)) }
    );
  }
  if (dp > s.tt) {
    blocks.push({
      type: 'amount',
      label: t('Kelebihan bayar (dikembalikan ke pelanggan)'),
      value: money(dp - s.tt),
    });
  }
  if (!s.lu && (s.rk ?? []).length > 0) {
    blocks.push({
      type: 'box',
      title: t('Transfer pembayaran ke'),
      lines: (s.rk ?? []).flatMap(([bank, nomor, nama]) => [
        { text: `${bank} · ${nomor}`, bold: true },
        { text: t('a.n. {nama}', { nama }) },
      ]),
    });
  }
  blocks.push({ type: 'text', text: t('*Harga sudah termasuk jastip fee'), size: 15 }, { type: 'dashed' });
  return blocks;
}
