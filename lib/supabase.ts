import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './backend';

// The login session is kept in the same on-device storage as everything
// else. Wrapped because this module is also evaluated in Node when the
// web app is statically exported, where there is no storage to touch.
const hasStorage = typeof window !== 'undefined';
const sessionStorage = {
  getItem: (key: string) => (hasStorage ? AsyncStorage.getItem(key) : Promise.resolve(null)),
  setItem: (key: string, value: string) =>
    hasStorage ? AsyncStorage.setItem(key, value) : Promise.resolve(),
  removeItem: (key: string) => (hasStorage ? AsyncStorage.removeItem(key) : Promise.resolve()),
};

// Used for accounts and shops (lib/auth-store.tsx). The public order-form
// inbox still talks to the server through lib/backend.ts's plain `rpc`,
// since customers have no session.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: sessionStorage,
    persistSession: true,
    autoRefreshToken: hasStorage,
    // Sessions never arrive in the URL in this app (no magic links yet).
    detectSessionInUrl: false,
  },
});
