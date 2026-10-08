// Currencies an Internasional event can be priced in. A Lokal event is
// always IDR. Whatever the currency, everything stored and totalled
// (harga, tagihan, revenue, profit) is in IDR: a foreign price is
// converted with the event's kurs the moment it's entered.

export const CURRENCIES = [
  { code: 'USD', name: 'Dolar Amerika' },
  { code: 'SGD', name: 'Dolar Singapura' },
  { code: 'MYR', name: 'Ringgit Malaysia' },
  { code: 'THB', name: 'Baht Thailand' },
  { code: 'JPY', name: 'Yen Jepang' },
  { code: 'KRW', name: 'Won Korea' },
  { code: 'CNY', name: 'Yuan Tiongkok' },
  { code: 'HKD', name: 'Dolar Hong Kong' },
  { code: 'TWD', name: 'Dolar Taiwan' },
  { code: 'AUD', name: 'Dolar Australia' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'Poundsterling' },
  { code: 'SAR', name: 'Riyal Saudi' },
] as const;

type EventCurrencyFields = { jenis?: 'lokal' | 'internasional'; mataUang?: string; kurs?: number };

/** The currency prices are typed in for this event, and its rate to IDR. */
export function eventCurrency(event?: EventCurrencyFields | null) {
  const foreign =
    event?.jenis === 'internasional' && !!event.mataUang && !!event.kurs && event.kurs > 0;
  return foreign
    ? { foreign: true as const, code: event.mataUang as string, kurs: event.kurs as number }
    : { foreign: false as const, code: 'IDR', kurs: 1 };
}

/** Reads a typed amount that may use a comma as the decimal mark. */
export function parseDecimal(text: string) {
  const n = Number(text.replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function formatForeign(amount: number, code: string) {
  return `${code} ${amount.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
}
