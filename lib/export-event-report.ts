import {
  type JastipEvent,
  type Order,
  type OrderItem,
  getSisaPembayaran,
  getTotalTagihan,
} from '@/lib/events-store';
import { Platform } from 'react-native';

// The event's report as an Excel file, laid out after the owner's own
// template ("Example format for Shopper download report.xlsx"): one sheet
// with the event and its finances at the top and every order below, one
// row per product; a second sheet lists the event's expenses. Built on the
// device — nothing is sent anywhere. Web only for now: saving a file on a
// phone needs the native file/share modules, which the app doesn't include.
//
// Amounts are real numbers with an "IDR" number format (the template typed
// them as text), so they can be summed and filtered in a spreadsheet.

type CellObject = {
  value: string | number | Date;
  fontWeight?: 'bold';
  align?: 'left' | 'right';
  format?: string;
  columnSpan?: number;
};
type Cell = string | number | Date | null | CellObject;

const IDR = '"IDR "#,##0';
const DATE = 'dd/mm/yyyy';

const bold = (value: string): Cell => ({ value, fontWeight: 'bold' });
const money = (value: number): Cell => ({ value, format: IDR, align: 'right' });
const count = (value: number): Cell => ({ value, align: 'right' });
const date = (value: Date): Cell => ({ value, format: DATE, align: 'left' });

const STATUS_LABEL: Record<Order['statusPembayaran'], string> = {
  lunas: 'Lunas',
  belumLunas: 'Belum lunas',
  belum: 'Belum dibayar',
};

/** Jastip fee for one line: per unit, percent of the price or a flat amount. */
function itemFee(item: OrderItem) {
  const perUnit = item.feeType === 'percent' ? (item.harga * item.feeValue) / 100 : item.feeValue;
  return Math.round(perUnit * item.jumlah);
}

const sumTagihan = (orders: Order[]) =>
  orders.reduce((total, order) => total + getTotalTagihan(order), 0);

/** Places `right` beside `left` from column D on, as in the template. */
function sideBySide(left: Cell[][], right: Cell[][]): Cell[][] {
  const rows: Cell[][] = [];
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const l = left[i] ?? [];
    rows.push([l[0] ?? null, l[1] ?? null, null, ...(right[i] ?? [])]);
  }
  return rows;
}

function headerRows(event: JastipEvent): Cell[][] {
  const lunas = event.orders.filter((o) => o.statusPembayaran === 'lunas');
  const sebagian = event.orders.filter((o) => o.statusPembayaran === 'belumLunas');
  const belum = event.orders.filter((o) => o.statusPembayaran === 'belum');
  const expenses = (event.pengeluaran ?? []).reduce((total, x) => total + x.jumlah, 0);
  const foreign = event.jenis === 'internasional';

  const left: Cell[][] = [
    [bold('Laporan event')],
    ['Nama acara', event.namaAcara],
    ['Kode event', event.kodeEvent],
    ['Tanggal mulai', date(event.tanggalDari)],
    ['Tanggal selesai', date(event.tanggalSampai)],
    ['Lokasi', event.lokasi],
    ['Jenis event', foreign ? 'Internasional' : 'Lokal'],
    ...(foreign
      ? ([
          ['Mata uang belanja', event.mataUang ?? ''],
          ['Kurs ke IDR', { value: event.kurs ?? 0, align: 'left' }],
        ] as Cell[][])
      : []),
  ];
  const right: Cell[][] = [
    [bold('Keuangan')],
    ['Jastip budget', money(event.budget ?? 0)],
    ['Pengeluaran', money(expenses)],
    ['Pesanan', count(event.totalOrder)],
    ['Revenue', money(event.revenue)],
    ['Profit', money(event.profit)],
    [],
    [bold('Status pembayaran'), bold('Jumlah pesanan'), bold('Total tagihan')],
    ['Lunas', count(lunas.length), money(sumTagihan(lunas))],
    ['Belum lunas', count(sebagian.length), money(sumTagihan(sebagian))],
    ['Belum dibayar', count(belum.length), money(sumTagihan(belum))],
  ];
  return [
    [
      {
        value: 'Powered by Shopper App. No.1 Apps for Jastiper',
        fontWeight: 'bold',
        columnSpan: 3,
      },
    ],
    [],
    ...sideBySide(left, right),
    [],
    [],
    [],
  ];
}

function orderRows(event: JastipEvent): Cell[][] {
  const foreign = event.jenis === 'internasional';
  const header = [
    'Tanggal pesanan',
    'No. order',
    'Nama pelanggan',
    'Nama produk',
    'Jumlah',
    'Harga',
    'Fee jastip',
    'Fee jastip (%)',
    'Fee jastip (IDR)',
    'Harga + fee jastip',
    'DP',
    'Sisa pembayaran',
    'Payment type',
    'Status pembayaran',
    'Ongkir',
    'Total tagihan pesanan',
    ...(foreign ? [`Harga (${event.mataUang ?? 'mata uang asing'})`] : []),
  ].map(bold);
  const rows: Cell[][] = [header];
  for (const order of event.orders) {
    const total = getTotalTagihan(order);
    order.items.forEach((item, index) => {
      const first = index === 0;
      const subtotal = item.harga * item.jumlah;
      const fee = itemFee(item);
      rows.push([
        order.dibuat ? date(new Date(order.dibuat)) : null,
        // On every product row, so one customer's rows can be told apart
        // by order.
        order.orderNumber,
        order.nama,
        item.namaProduk,
        item.jumlah,
        money(item.harga),
        item.feeType === 'percent' ? 'Pakai %' : 'Pakai IDR',
        item.feeType === 'percent' ? item.feeValue : null,
        money(fee),
        money(subtotal + fee),
        // Order-level figures once per order, so the columns can be summed.
        first && order.dp ? money(order.dp) : null,
        first ? money(getSisaPembayaran(order)) : null,
        // Payment type isn't recorded in the app yet: left empty for the
        // jastiper to fill in.
        null,
        STATUS_LABEL[order.statusPembayaran] ?? '',
        first && order.pembayaranOngkir === 'awal' ? money(order.ongkir ?? 0) : null,
        first ? money(total) : null,
        ...(foreign ? [item.hargaAsing ?? null] : []),
      ]);
    });
  }
  return rows;
}

function expenseRows(event: JastipEvent): Cell[][] {
  return [
    ['Deskripsi', 'Tanggal', 'Jumlah'].map(bold),
    ...(event.pengeluaran ?? []).map((x): Cell[] => [
      x.nama,
      x.tanggal ? date(new Date(x.tanggal)) : null,
      money(x.jumlah),
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
  const blob = await writeExcelFile([
    {
      data: [...headerRows(event), ...orderRows(event)],
      sheet: 'Laporan',
      columns: widths(17, 13, 28, 26, 19, 16, 16, 14, 17, 19, 12, 18, 14, 18, 14, 22, 16),
    },
    { data: expenseRows(event), sheet: 'Pengeluaran', columns: widths(36, 14, 16) },
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
