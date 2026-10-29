// The shop's own currency, which every amount in the app is in: prices,
// fees, bills, revenue, profit, expenses. It follows the country the owner
// picked at sign-up (decided 2026-10-29): Indonesia IDR, Malaysia MYR,
// the US USD, Singapore SGD, the Philippines PHP, Vietnam VND, any other
// country USD. Shops from before countries existed have none and stay on
// IDR.
//
// Amounts are plain numbers in that currency. IDR and VND have no cents;
// the others keep two decimals. Set once the shop is known (lib/auth-store.tsx); a
// customer page passes the currency its link carries instead.

export type HomeCurrency = 'IDR' | 'MYR' | 'USD' | 'SGD' | 'PHP' | 'VND';

const BY_COUNTRY: Record<string, HomeCurrency> = {
  ID: 'IDR',
  MY: 'MYR',
  US: 'USD',
  SG: 'SGD',
  PH: 'PHP',
  VN: 'VND',
};

// How each currency is written before the amount.
const SYMBOL: Record<HomeCurrency, string> = {
  IDR: 'IDR',
  MYR: 'RM',
  USD: 'USD',
  SGD: 'SGD',
  PHP: 'PHP',
  VND: 'VND',
};

// Currencies without cents, written with dots between thousands.
const WHOLE: HomeCurrency[] = ['IDR', 'VND'];

let current: HomeCurrency = 'IDR';

export function currencyForCountry(country: string | null | undefined): HomeCurrency {
  if (!country) return 'IDR';
  return BY_COUNTRY[country] ?? 'USD';
}

export function setHomeCurrency(currency: HomeCurrency) {
  current = currency;
}

export function getHomeCurrency(): HomeCurrency {
  return current;
}

export function isHomeCurrency(value: unknown): value is HomeCurrency {
  return typeof value === 'string' && value in SYMBOL;
}

/** Digits after the decimal point: none for IDR and VND, two for the others. */
export function decimalsOf(currency: HomeCurrency = current) {
  return WHOLE.includes(currency) ? 0 : 2;
}

/** Rounds to what the currency can hold (whole rupiah, or cents). */
export function roundMoney(amount: number, currency: HomeCurrency = current) {
  const factor = 10 ** decimalsOf(currency);
  return Math.round(amount * factor) / factor;
}

/** "IDR 5.000.000", "VND 250.000", "RM 12.50", "PHP 1,250.00", "USD 9.99". */
export function formatMoney(amount: number, currency: HomeCurrency = current) {
  const decimals = decimalsOf(currency);
  const number = amount.toLocaleString(decimals === 0 ? 'id-ID' : 'en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${SYMBOL[currency]} ${number}`;
}

/** The label in front of an amount field: "IDR", "RM", "SGD", "PHP"... */
export function currencyLabel(currency: HomeCurrency = current) {
  return SYMBOL[currency];
}

/** Keeps only what can be part of an amount as it's typed: digits, and
 * for currencies with cents one decimal point and at most two digits
 * after it. Commas are thousands separators there (see formatAmountInput)
 * and are dropped. */
export function cleanAmountInput(text: string, currency: HomeCurrency = current) {
  if (decimalsOf(currency) === 0) return text.replace(/\D/g, '');
  const normalized = text.replace(/[^0-9.]/g, '');
  const [whole, ...rest] = normalized.split('.');
  return rest.length > 0 ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
}

/** How a cleaned amount shows in its field while typing: "1.250.000" for
 * IDR and VND, "1,250.5" for the others (a trailing "." is kept). */
export function formatAmountInput(text: string, currency: HomeCurrency = current) {
  if (!text) return '';
  if (decimalsOf(currency) === 0) return Number(text).toLocaleString('id-ID');
  const [whole, fraction] = text.split('.');
  const grouped = Number(whole || '0').toLocaleString('en-US');
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** Reads a typed amount; 0 when empty or unreadable. */
export function parseAmount(text: string) {
  const n = Number(text);
  return Number.isFinite(n) ? n : 0;
}

/** The phone keyboard for an amount field: with a decimal point only for
 * currencies that have cents. */
export function amountKeyboard(currency: HomeCurrency = current) {
  return decimalsOf(currency) === 0 ? ('number-pad' as const) : ('decimal-pad' as const);
}

/** The currency's name, in Indonesian; shown through t(). */
export function currencyName(currency: HomeCurrency = current) {
  return {
    IDR: 'Rupiah',
    MYR: 'Ringgit Malaysia',
    SGD: 'Dolar Singapura',
    USD: 'Dolar Amerika',
    PHP: 'Peso Filipina',
    VND: 'Dong Vietnam',
  }[currency];
}
