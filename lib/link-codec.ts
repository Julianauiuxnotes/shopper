// Shared pieces of the app's self-contained links (the customer's
// receipt, lib/receipt-link.ts, and the customer order form,
// lib/order-form-link.ts). With no backend, such a link carries its own
// data after the "#": fields joined by ".", text left readable, numbers in
// base 36. Only A-Z a-z 0-9 and "-._~" ever appear, so chat apps link the
// whole thing and nothing needs percent-escaping.

// Calendar day as a whole number of days since 1970, independent of the
// time zone the link is opened in.
export function toDayNumber(date: Date) {
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}

export function fromDayNumber(day: number) {
  const utc = new Date(day * 86400000);
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate());
}

// Text: letters and digits as they are, space as "-", "-" as "_", and
// every other character as "~" + two hex digits per UTF-8 byte.
export function escapeText(text: string) {
  let out = '';
  for (const byte of new TextEncoder().encode(text)) {
    const ch = String.fromCharCode(byte);
    if (/[A-Za-z0-9]/.test(ch)) out += ch;
    else if (ch === ' ') out += '-';
    else if (ch === '-') out += '_';
    else out += '~' + byte.toString(16).padStart(2, '0');
  }
  return out;
}

export function unescapeText(escaped: string) {
  const bytes: number[] = [];
  for (let i = 0; i < escaped.length; i++) {
    const ch = escaped[i];
    if (ch === '~') {
      bytes.push(parseInt(escaped.slice(i + 1, i + 3), 16));
      i += 2;
    } else if (ch === '-') bytes.push(0x20);
    else if (ch === '_') bytes.push(0x2d);
    else bytes.push(ch.charCodeAt(0));
  }
  return new TextDecoder().decode(Uint8Array.from(bytes));
}

export const num = (n: number) => Math.max(0, Math.round(n)).toString(36);

// Where the public receipt page lives. On web it's this same site (so it
// works from localhost and from GitHub Pages alike); a native build has
// no origin of its own, so it points at the deployed web app.
const DEPLOYED_WEB_URL = 'https://julianauiuxnotes.github.io/shopper';

export function publicBaseUrl() {
  return typeof window !== 'undefined' && window.location?.origin
    ? `${window.location.origin}${process.env.EXPO_PUBLIC_BASE_URL ?? ''}`
    : DEPLOYED_WEB_URL;
}
