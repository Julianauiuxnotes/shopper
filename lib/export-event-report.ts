import { type JastipEvent, type Order, type OrderItem, getTotalTagihan } from '@/lib/events-store';
import { Platform } from 'react-native';

// The event's report as an Excel file: a summary sheet, every order (one
// row per product) and the event's expenses. Built on the device — nothing
// is sent anywhere. Web only for now: saving a file on a phone needs the
// native file/share modules, which the app doesn't include yet.

type Cell = string | number | Date | null | { value: string | number; fontWeight: 'bold' };

const bold = (value: string): Cell => ({ value, fontWeight: 'bold' });

const METODE: Record<Order['metodePengiriman'], string> = {
  instant: 'Instant',
  ekspedisi: 'Ekspedisi',
};

function ongkirNote(order: Order) {
  if (order.pembayaranOngkir === 'awal') return 'Bayar di awal';
  if (order.pembayaranOngkir === 'saatPengiriman') return 'Bayar saat pengiriman';
  if (order.pembayaranOngkir === 'gratis') return 'Free ongkir';
  return '';
}

/** Jastip fee for one line: per unit, percent of the price or a flat amount. */
function itemFee(item: OrderItem) {
  const perUnit = item.feeType === 'percent' ? (item.harga * item.feeValue) / 100 : item.feeValue;
  return Math.round(perUnit * item.jumlah);
}

function orderRows(event: JastipEvent): Cell[][] {
  const header = [
    'No. pesanan',
    'Nama',
    'No. Whatsapp',
    'Alamat',
    'Metode pengiriman',
    'Status pembayaran',
    'Produk',
    'Jumlah',
    'Harga satuan (mata uang asing)',
    'Harga satuan',
    'Subtotal barang',
    'Fee jastip',
    'Sudah dibeli',
    'Pembayaran ongkir',
    'Ongkir',
    'Total tagihan pesanan',
  ].map(bold);
  const rows: Cell[][] = [header];
  for (const order of event.orders) {
    order.items.forEach((item, index) => {
      const first = index === 0;
      rows.push([
        order.orderNumber,
        order.nama,
        order.whatsapp ? `+62${order.whatsapp}` : '',
        order.alamat,
        METODE[order.metodePengiriman] ?? '',
        order.statusPembayaran === 'lunas' ? 'Lunas' : 'Belum dibayar',
        item.namaProduk,
        item.jumlah,
        item.hargaAsing ?? null,
        item.harga,
        item.harga * item.jumlah,
        itemFee(item),
        item.dibeli ? 'Ya' : 'Belum',
        // Order-level figures once per order, so the columns can be summed.
        first ? ongkirNote(order) : null,
        first && order.pembayaranOngkir === 'awal' ? (order.ongkir ?? 0) : null,
        first ? getTotalTagihan(order) : null,
      ]);
    });
  }
  return rows;
}

function summaryRows(event: JastipEvent): Cell[][] {
  const lunas = event.orders.filter((o) => o.statusPembayaran === 'lunas');
  const belum = event.orders.filter((o) => o.statusPembayaran === 'belum');
  const sum = (orders: Order[]) => orders.reduce((total, o) => total + getTotalTagihan(o), 0);
  const expenses = (event.pengeluaran ?? []).reduce((total, x) => total + x.jumlah, 0);
  return [
    [bold('Laporan event')],
    ['Nama acara', event.namaAcara],
    ['Kode event', event.kodeEvent],
    ['Tanggal mulai', event.tanggalDari],
    ['Tanggal selesai', event.tanggalSampai],
    ['Lokasi', event.lokasi],
    ['Jenis event', event.jenis === 'internasional' ? 'Internasional' : 'Lokal'],
    ...(event.jenis === 'internasional'
      ? ([
          ['Mata uang belanja', event.mataUang ?? ''],
          ['Kurs ke IDR', event.kurs ?? 0],
        ] as Cell[][])
      : []),
    [],
    [bold('Keuangan')],
    ['Jastip budget', event.budget ?? 0],
    ['Pengeluaran', expenses],
    ['Pesanan', event.totalOrder],
    ['Revenue', event.revenue],
    ['Profit', event.profit],
    [],
    [bold('Status pembayaran'), bold('Jumlah pesanan'), bold('Total tagihan')],
    ['Lunas', lunas.length, sum(lunas)],
    ['Belum dibayar', belum.length, sum(belum)],
  ];
}

function expenseRows(event: JastipEvent): Cell[][] {
  return [
    ['Deskripsi', 'Tanggal', 'Jumlah'].map(bold),
    ...(event.pengeluaran ?? []).map((x): Cell[] => [
      x.nama,
      x.tanggal ? new Date(x.tanggal) : null,
      x.jumlah,
    ]),
  ];
}

const widths = (...values: number[]) => values.map((width) => ({ width }));

export const canExportReport = Platform.OS === 'web';

/** Builds the report and saves it through the browser's download. */
export async function downloadEventReport(event: JastipEvent) {
  if (!canExportReport) throw new Error('Report download is only available on web');
  // Loaded on demand: only this action needs the spreadsheet writer.
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const dateFormat = 'dd/mm/yyyy';
  const blob = await writeExcelFile([
    { data: summaryRows(event), sheet: 'Ringkasan', columns: widths(22, 26, 18), dateFormat },
    {
      data: orderRows(event),
      sheet: 'Pesanan',
      columns: widths(13, 20, 17, 30, 18, 18, 28, 9, 18, 14, 16, 12, 13, 22, 12, 22),
      stickyRowsCount: 1,
      dateFormat,
    },
    { data: expenseRows(event), sheet: 'Pengeluaran', columns: widths(36, 14, 16), dateFormat },
  ]).toBlob();

  const safeName = event.namaAcara.replace(/[^\w\- ]+/g, '').trim() || 'event';
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Laporan ${safeName} ${event.kodeEvent}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
