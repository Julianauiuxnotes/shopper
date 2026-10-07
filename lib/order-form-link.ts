import type { JastipEvent } from './events-store';
import { formatDateRange } from './format';
import {
  escapeText,
  fromDayNumber,
  num,
  publicBaseUrl,
  toDayNumber,
  unescapeText,
} from './link-codec';

// What the customer order form (app/o.tsx) needs to know about the event
// it's for. Like the receipt link (lib/receipt-link.ts), the link itself
// carries this, since events are stored only on the jastiper's device.
// `inboxId` is where a submitted order is sent (lib/order-inbox.ts).
export type OrderFormInfo = {
  namaJastip: string;
  /** Jastiper's contact number shown on the bukti, local digits ('' = not set) */
  whatsappJastip: string;
  /** Public id of the jastiper's order inbox */
  inboxId: string;
  namaAcara: string;
  /** Already formatted, e.g. "4 - 6 Sep 2026" */
  tanggalAcara: string;
  lokasi: string;
  kodeEvent: string;
};

// "1" then: nama jastip . whatsapp . nama acara . date from . date to .
// lokasi . kode event . inbox id  (see lib/link-codec.ts for the encoding)
const FIELDS = 8;

export function buildOrderFormLink(
  event: JastipEvent,
  jastiper: { namaJastip: string; whatsapp: string; inboxId: string }
) {
  const fields = [
    escapeText(jastiper.namaJastip),
    escapeText(jastiper.whatsapp),
    escapeText(event.namaAcara),
    num(toDayNumber(event.tanggalDari)),
    num(toDayNumber(event.tanggalSampai)),
    escapeText(event.lokasi),
    escapeText(event.kodeEvent),
    jastiper.inboxId,
  ];
  return `${publicBaseUrl()}/o#1.${fields.join('.')}`;
}

/** Returns null for anything that isn't a well-formed order-form link. */
export function decodeOrderFormInfo(encoded: string): OrderFormInfo | null {
  try {
    if (!encoded.startsWith('1.')) return null;
    const f = encoded.split('.').slice(1);
    if (f.length !== FIELDS) return null;
    const from = parseInt(f[3], 36);
    const to = parseInt(f[4], 36);
    if (Number.isNaN(from) || Number.isNaN(to)) return null;
    const namaAcara = unescapeText(f[2]);
    const inboxId = f[7];
    if (!namaAcara || !/^[0-9a-f]{20}$/.test(inboxId)) return null;
    return {
      namaJastip: unescapeText(f[0]),
      whatsappJastip: unescapeText(f[1]).replace(/\D/g, ''),
      namaAcara,
      tanggalAcara: formatDateRange(fromDayNumber(from), fromDayNumber(to)),
      lokasi: unescapeText(f[5]),
      kodeEvent: unescapeText(f[6]),
      inboxId,
    };
  } catch {
    return null;
  }
}
