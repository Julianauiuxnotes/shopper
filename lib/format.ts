import { getLanguage } from './i18n';

const MONTH_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];
const MONTH_SHORT_EN = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Short month name in the app's language (lib/i18n.tsx). */
function monthShort(month: number) {
  return (getLanguage() === 'en' ? MONTH_SHORT_EN : MONTH_SHORT_ID)[month];
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** dd/mm/yyyy */
export function formatDate(date?: Date) {
  if (!date) return '';
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Matches Figma's event-card style, e.g. "4 - 6 Sep 2026" (same
 * month/year) or "28 Des 2026 - 3 Jan 2027" (crossing month/year, not
 * shown in the source mockups but a real case the app will hit).
 */
export function formatDateRange(from: Date, to: Date) {
  const sameMonthYear =
    from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  if (sameMonthYear) {
    return `${from.getDate()} - ${to.getDate()} ${monthShort(from.getMonth())} ${from.getFullYear()}`;
  }
  const sameYear = from.getFullYear() === to.getFullYear();
  const fromLabel = sameYear
    ? `${from.getDate()} ${monthShort(from.getMonth())}`
    : `${from.getDate()} ${monthShort(from.getMonth())} ${from.getFullYear()}`;
  return `${fromLabel} - ${to.getDate()} ${monthShort(to.getMonth())} ${to.getFullYear()}`;
}


/** Matches Cetak Penanda's "Waktu cetak" style, e.g. "4 Sep 2026 , 12:33 WIB". */
export function formatPrintTimestamp(date: Date) {
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  return `${date.getDate()} ${monthShort(date.getMonth())} ${date.getFullYear()} , ${hh}:${mm} WIB`;
}

/** Day-granularity range check (ignores time-of-day, so "today" matches
 * an event whose tanggalSampai is midnight of that same day). */
export function isDateInRange(date: Date, from: Date, to: Date) {
  const key = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  const k = key(date);
  return k >= key(from) && k <= key(to);
}
