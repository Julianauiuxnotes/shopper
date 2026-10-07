import { useAuth } from '@/lib/auth-store';
import { backendConfigured } from '@/lib/backend';
import { type JastipEvent, useEvents } from '@/lib/events-store';
import { syncOnce } from '@/lib/sync';
import { setOffline } from '@/lib/sync-status';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

// How often to look for changes made on other devices while the app is open.
const POLL_MS = 30_000;
// How long after a local change to wait before sending it, so a burst of
// typing becomes one upload instead of one per keystroke.
const DEBOUNCE_MS = 1_500;

// Runs lib/sync.ts for the logged-in shop: when the app opens, when it
// comes back to the foreground or back online, shortly after any local
// change, and every 30 seconds. Renders nothing; mounted once in
// app/_layout.tsx. Also keeps lib/sync-status.ts's offline flag current
// for the banner.
function DataSync() {
  const { events, replaceEvents, ready: eventsReady } = useEvents();
  const { shop, signedIn } = useAuth();
  const shopId = signedIn ? (shop?.id ?? null) : null;

  // The engine's view of the list. Updated on every render, and also
  // synchronously whenever the engine itself changes the list, so it can
  // keep working without waiting for React to re-render.
  const latest = React.useRef<JastipEvent[]>(events);
  latest.current = events;

  const running = React.useRef(false);
  const again = React.useRef(false);

  const sync = React.useCallback(async () => {
    if (!backendConfigured || !shopId) return;
    if (running.current) {
      // A change arrived mid-pass; run once more when this pass ends.
      again.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        again.current = false;
        await syncOnce(
          shopId,
          () => latest.current,
          (updater) => {
            latest.current = updater(latest.current);
            replaceEvents(updater);
          }
        );
      } while (again.current);
      setOffline(false);
    } catch {
      // Couldn't reach the server. Local changes are kept and sent on the
      // next successful pass.
      setOffline(true);
    } finally {
      running.current = false;
    }
  }, [shopId, replaceEvents]);

  // On open, on foreground, back online, and on a timer.
  React.useEffect(() => {
    if (!eventsReady || !shopId) return;
    sync();
    const timer = setInterval(sync, POLL_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    const cleanups: Array<() => void> = [];
    if (Platform.OS === 'web') {
      const onOnline = () => sync();
      const onOffline = () => setOffline(true);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      if (navigator.onLine === false) setOffline(true);
      cleanups.push(() => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      });
    }
    return () => {
      clearInterval(timer);
      subscription.remove();
      for (const cleanup of cleanups) cleanup();
    };
  }, [eventsReady, shopId, sync]);

  // Shortly after any change to the list (including ones a sync applied,
  // which then find nothing left to send).
  React.useEffect(() => {
    if (!eventsReady || !shopId) return;
    const timer = setTimeout(sync, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [events, eventsReady, shopId, sync]);

  // Logged out: nothing to be offline from.
  React.useEffect(() => {
    if (!shopId) setOffline(false);
  }, [shopId]);

  return null;
}

export { DataSync };
