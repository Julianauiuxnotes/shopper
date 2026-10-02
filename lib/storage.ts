import AsyncStorage from '@react-native-async-storage/async-storage';

// Persists data on-device so it survives reloads/restarts — same
// principle as the separate Cashly project's own localStorage
// persistence (lib/storage there is window.localStorage directly,
// since Cashly is a plain web app). Shopper is React Native, so this
// uses AsyncStorage instead: it's backed by localStorage on web and by
// the native platform's own storage on iOS/Android, giving the same
// "just works, no backend needed" persistence on every platform this
// app actually targets. Falls back to an in-memory copy if storage
// throws (e.g. a browser in private-mode where localStorage access is
// blocked), matching Cashly's own fallback behavior.
const mem: Record<string, unknown> = {};
const PREFIX = 'shopper:';

export const storage = {
  async get<T>(key: string, fallback: T): Promise<T> {
    try {
      const raw = await AsyncStorage.getItem(PREFIX + key);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch {
      // storage unavailable — fall through to the in-memory copy below
    }
    return key in mem ? (mem[key] as T) : fallback;
  },
  async set(key: string, value: unknown): Promise<void> {
    mem[key] = value;
    try {
      await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // ignore — the in-memory copy above already holds this value for
      // the rest of this session
    }
  },
};
