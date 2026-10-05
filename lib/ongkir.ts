// The "Pembayaran ongkos kirim" options on Order Detail; the labels are
// also printed on the customer's tagihan (components/tagihan-receipt.tsx).
// `info` is the grey helper line under each label (Figma node 181:558).
// Figma's second row just repeats its own label there, read as
// placeholder copy, so that one is this app's own wording.
export const ONGKIR_OPTIONS = [
  {
    value: 'awal',
    label: 'Bayar ongkir di awal',
    info: 'Ongkir ditambahkan ke total tagihan pelanggan.',
  },
  {
    value: 'saatPengiriman',
    label: 'Ongkir dibayar saat pengiriman',
    info: 'Pelanggan bayar ongkir langsung ke kurir.',
  },
  {
    value: 'gratis',
    label: 'Free ongkir',
    info: 'Pelanggan tidak dikenakan ongkir.',
  },
] as const;
