import * as React from 'react';

// Whether the app can currently reach the server, as last observed by the
// sync engine (components/data-sync.tsx) and, on web, the browser's own
// online/offline events. A tiny module-level store rather than a context,
// so the banner can read it without another provider.
let offline = false;
const listeners = new Set<() => void>();

export function setOffline(value: boolean) {
  if (offline === value) return;
  offline = value;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOffline() {
  return React.useSyncExternalStore(
    subscribe,
    () => offline,
    () => false
  );
}
