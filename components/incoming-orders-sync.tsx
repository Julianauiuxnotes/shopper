import { useEvents } from '@/lib/events-store';
import { ackIncomingOrders, fetchIncomingOrders } from '@/lib/order-inbox';
import { backendConfigured } from '@/lib/backend';
import { useSettings } from '@/lib/settings-store';
import { storage } from '@/lib/storage';
import * as React from 'react';
import { AppState } from 'react-native';

const POLL_MS = 60_000;
// How many already-saved submission ids to remember. Guards against
// adding an order twice if it was saved here but the acknowledgement
// never reached the server.
const REMEMBERED_IDS = 500;

// Collects orders customers submitted through the public order form
// (app/o.tsx) from this jastiper's order inbox and adds them to the
// matching event, as orders with no prices yet. Renders nothing; mounted
// once in app/_layout.tsx. Checks when the app opens, when it comes back
// to the foreground, and once a minute while open.
//
// Orders for an event this device doesn't have are left on the server
// rather than discarded.
function IncomingOrdersSync() {
  const { events, addOrder, ready: eventsReady } = useEvents();
  const { orderInbox, ready: settingsReady } = useSettings();

  // The poll outlives renders; read the latest values through a ref.
  const latest = React.useRef({ events, addOrder });
  latest.current = { events, addOrder };
  const running = React.useRef(false);

  const sync = React.useCallback(async () => {
    if (!backendConfigured || !orderInbox || running.current) return;
    running.current = true;
    try {
      const { orders, invalidIds } = await fetchIncomingOrders(orderInbox);
      if (orders.length === 0 && invalidIds.length === 0) return;

      const seen = await storage.get<string[]>('processedSubmissions', []);
      const toAck = [...invalidIds];
      for (const incoming of orders) {
        if (seen.includes(incoming.id)) {
          toAck.push(incoming.id);
          continue;
        }
        const event = latest.current.events.find((e) => e.kodeEvent === incoming.kodeEvent);
        if (!event) continue;
        const added = latest.current.addOrder(event.id, {
          nama: incoming.order.nama,
          alamat: incoming.order.alamat,
          whatsapp: `+62${incoming.order.whatsapp}`,
          metodePengiriman: incoming.order.metodePengiriman,
          items: incoming.order.items.map((it) => ({
            namaProduk: it.namaProduk,
            jumlah: it.jumlah,
            harga: 0,
            feeType: 'percent' as const,
            feeValue: 0,
          })),
          sumber: 'customer',
        });
        if (added) {
          seen.push(incoming.id);
          toAck.push(incoming.id);
        }
      }
      await storage.set('processedSubmissions', seen.slice(-REMEMBERED_IDS));
      await ackIncomingOrders(orderInbox, toAck);
    } catch {
      // offline or server unavailable — the next check will try again.
    } finally {
      running.current = false;
    }
  }, [orderInbox]);

  React.useEffect(() => {
    if (!eventsReady || !settingsReady || !orderInbox) return;
    sync();
    const timer = setInterval(sync, POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [eventsReady, settingsReady, orderInbox, sync]);

  return null;
}

export { IncomingOrdersSync };
