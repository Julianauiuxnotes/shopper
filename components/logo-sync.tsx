import { useAuth } from '@/lib/auth-store';
import { backendConfigured } from '@/lib/backend';
import { useSettings } from '@/lib/settings-store';
import { storage } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import * as React from 'react';
import { AppState, Platform } from 'react-native';

// Keeps the shop's logo the same on every device (table `shop_logos`,
// supabase/migrations/0006). The logo stays stored on the device as
// before, so it shows instantly and offline; this only decides when to
// send the device's copy up or bring the server's copy down:
//
// - the owner uploaded, replaced or removed the logo here -> send it up;
// - the server's copy is newer than what this device last saw -> bring it
//   down (this is how a second device, or a member, gets the logo);
// - a logo that was on this device before syncing existed is sent up the
//   first time, so existing shops keep theirs.
//
// Renders nothing; mounted once in app/_layout.tsx. Failures (offline, or
// the table not created yet) are ignored and retried on the next pass.

// What this device last agreed with the server about.
type LogoSyncState = {
  shopId: string;
  /** Fingerprint of the logo as of that moment ('' = no logo). */
  mark: string;
  /** The server row's `server_updated_at` then, or null if it had none. */
  version: string | null;
};

// Not security, just "is this the same picture": length plus a cheap hash.
function fingerprint(logo: string | null) {
  if (!logo) return '';
  let hash = 5381;
  for (let i = 0; i < logo.length; i += 97) hash = ((hash << 5) + hash + logo.charCodeAt(i)) | 0;
  return `${logo.length}:${hash}`;
}

function LogoSync() {
  const { shop, role, signedIn } = useAuth();
  const { logoJastip, setLogoJastip, ready } = useSettings();
  const shopId = signedIn ? (shop?.id ?? null) : null;
  const isOwner = role === 'owner';

  const latestLogo = React.useRef(logoJastip);
  latestLogo.current = logoJastip;
  const running = React.useRef(false);
  const again = React.useRef(false);

  const sync = React.useCallback(async () => {
    if (!backendConfigured || !shopId || !ready) return;
    if (running.current) {
      again.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        again.current = false;
        const remote = await supabase
          .from('shop_logos')
          .select('server_updated_at')
          .eq('shop_id', shopId)
          .maybeSingle();
        if (remote.error) return;
        const serverVersion: string | null = remote.data?.server_updated_at ?? null;

        const known = await storage.get<LogoSyncState | null>('logoSync', null);
        const local = latestLogo.current;
        const sameShop = known?.shopId === shopId;
        const localChanged = sameShop && fingerprint(local) !== known.mark;
        const serverChanged = !sameShop || serverVersion !== known.version;
        // A logo from before syncing existed, on a device that has never
        // synced: the owner's copy becomes the shop's.
        const firstUpload = !known && !!local && serverVersion === null;

        if (isOwner && (localChanged || firstUpload)) {
          if (local) {
            const saved = await supabase
              .from('shop_logos')
              .upsert({ shop_id: shopId, data: local })
              .select('server_updated_at')
              .single();
            if (saved.error) return;
            await storage.set('logoSync', {
              shopId,
              mark: fingerprint(local),
              version: saved.data.server_updated_at,
            } satisfies LogoSyncState);
          } else {
            const removed = await supabase.from('shop_logos').delete().eq('shop_id', shopId);
            if (removed.error) return;
            await storage.set('logoSync', {
              shopId,
              mark: '',
              version: null,
            } satisfies LogoSyncState);
          }
        } else if (serverChanged || localChanged) {
          // Take the server's copy (or its absence). Also undoes a change
          // made on a device that isn't the owner's.
          let logo: string | null = null;
          if (serverVersion !== null) {
            const row = await supabase
              .from('shop_logos')
              .select('data, server_updated_at')
              .eq('shop_id', shopId)
              .maybeSingle();
            if (row.error) return;
            logo = row.data?.data ?? null;
          }
          await storage.set('logoSync', {
            shopId,
            mark: fingerprint(logo),
            version: logo ? serverVersion : null,
          } satisfies LogoSyncState);
          if (fingerprint(logo) !== fingerprint(latestLogo.current)) {
            latestLogo.current = logo;
            setLogoJastip(logo);
          }
        }
      } while (again.current);
    } catch {
      // Offline or the request failed: try again on the next pass.
    } finally {
      running.current = false;
    }
  }, [shopId, ready, isOwner, setLogoJastip]);

  // On open, on login, and whenever the logo on this device changes.
  React.useEffect(() => {
    sync();
  }, [sync, logoJastip]);

  // When the app comes back to the foreground or back online.
  React.useEffect(() => {
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') sync();
    });
    if (Platform.OS !== 'web') return () => appState.remove();
    window.addEventListener('online', sync);
    window.addEventListener('focus', sync);
    return () => {
      appState.remove();
      window.removeEventListener('online', sync);
      window.removeEventListener('focus', sync);
    };
  }, [sync]);

  return null;
}

export { LogoSync };
