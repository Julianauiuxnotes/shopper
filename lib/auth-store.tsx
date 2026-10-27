import type { Session } from '@supabase/supabase-js';
import * as React from 'react';
import { AppState, Platform } from 'react-native';
import { SUPABASE_KEY, SUPABASE_URL } from './backend';
import { newId, useEvents } from './events-store';
import { useSettings } from './settings-store';
import { storage } from './storage';
import { supabase } from './supabase';
import { resetSyncState } from './sync';

// Real accounts (Supabase Auth) and the shop a user belongs to — step 1
// of the accounts/plans/sync plan; see
// supabase/migrations/0002_shopper_accounts_and_shops.sql for the server
// side and its rules.
//
// Still a prototype: there is no invitation email (an invited person just signs up
// with the invited address), and password reset isn't built, since both
// need an email service this project doesn't have yet.
//
// Justipers tokens (supabase/migrations/0007_shopper_tokens.sql): the shop's
// balance, which events have been paid for, and the actions that spend
// tokens all live here. The server enforces every rule; the app only shows
// them.
//
// The rest of the app keeps reading names and settings from
// lib/settings-store.tsx; this provider fills that store from the server
// after login and writes changes back.

export type Role = 'owner' | 'admin' | 'member';

export type Shop = {
  id: string;
  name: string;
  telepon: string;
  adminWhatsapp: string;
  publikasiOpening: string;
  tokenBalance: number;
};

export type ShopMember = { userId: string; role: Role; nama: string; email: string };
export type ShopInvite = { id: string; email: string };

/** Ids of events opened / whose order form was published. `openedPaid`:
 * opened for a price (not free during the beta) and not refunded yet. */
export type EventCharges = { opened: string[]; published: string[]; openedPaid: string[] };

export type TokenEntry = {
  id: string;
  delta: number;
  balanceAfter: number;
  kind: string;
  eventId: string | null;
  email: string | null;
  note: string;
  createdAt: string;
};

/** What each action costs, in tokens. Read from the server's
 * shopper_token_prices; all 0 while Justipers is in beta. */
export type TokenPrices = { openEvent: number; publishEvent: number; memberSlot: number };
/** The prices once the beta ends; shown only until the server's have loaded. */
const LIST_PRICES: TokenPrices = { openEvent: 1, publishEvent: 1, memberSlot: 5 };

function isBeta(prices: TokenPrices) {
  return prices.openEvent === 0 && prices.publishEvent === 0 && prices.memberSlot === 0;
}

/** "Gratis" for a free action, otherwise "N token". */
export function costLabel(tokens: number) {
  return tokens === 0 ? 'Gratis' : `${tokens} token`;
}
/** People a shop can have besides its owner (members plus pending invites). */
export const MEMBER_LIMIT = 10;

type ShopState = {
  shop: Shop;
  role: Role;
  members: ShopMember[];
  invites: ShopInvite[];
  charges: EventCharges;
  prices: TokenPrices;
};

type SignUpInput = {
  nama: string;
  namaJastip: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  /** False until the saved session (if any) has been read. */
  ready: boolean;
  /** A message to show on the login screen (e.g. logged out because the
   * account became active elsewhere); null when there is none. */
  notice: string | null;
  clearNotice: () => void;
  signedIn: boolean;
  email: string;
  userId: string | null;
  shop: Shop | null;
  role: Role | null;
  /** Owner or admin: may spend the shop's tokens. */
  isAdmin: boolean;
  members: ShopMember[];
  invites: ShopInvite[];
  charges: EventCharges;
  prices: TokenPrices;
  /** The beta: every price is 0, so the shop's tokens are effectively unlimited. */
  beta: boolean;
  /** 'confirm_email' = the account exists but must be confirmed by email before logging in. */
  signUp: (input: SignUpInput) => Promise<'signed_in' | 'confirm_email'>;
  /**
   * Throws ActiveElsewhereError when the account is in use on another
   * browser or device, unless `takeOver` is set, which logs that one out.
   */
  signIn: (email: string, password: string, remember: boolean, takeOver?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  /** Owner only. Saves shop settings to the server and the local store. */
  updateShop: (patch: Partial<Omit<Shop, 'id' | 'tokenBalance'>>) => Promise<void>;
  updateMyName: (nama: string) => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  /** Admins only. Spends prices.openEvent for the event that will have this id; must succeed before the event is created. */
  openEvent: (eventId: string) => Promise<void>;
  /** Admins only. Spends prices.publishEvent the first time an event's order form is published. */
  publishEvent: (eventId: string) => Promise<void>;
  /** Returns the event's "Buka event" token if it still qualifies; true when it did. */
  refundEvent: (eventId: string) => Promise<boolean>;
  /** Admins only. Spends prices.memberSlot and invites this email. */
  buyMemberSlot: (email: string) => Promise<void>;
  /** Owner only. */
  setAdmin: (userId: string, admin: boolean) => Promise<void>;
  cancelInvite: (inviteId: string) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  /** The shop's latest token movements, newest first. */
  loadTokenHistory: () => Promise<TokenEntry[]>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

const NO_CHARGES: EventCharges = { opened: [], published: [], openedPaid: [] };

// Shown on the login screen of a device that was logged out because the
// account was taken over, or found active, on another one.
const LOGGED_OUT_ELSEWHERE = 'Kamu keluar karena akun ini sedang aktif di browser/perangkat lain.';

// How often an open app renews its hold on the account. The server lets
// another device in after 3 minutes of silence (see
// supabase/migrations/0004_shopper_single_active_session.sql).
const HEARTBEAT_MS = 30_000;

async function getDeviceId() {
  let id = await storage.get<string | null>('deviceId', null);
  if (!id) {
    id = newId('d');
    await storage.set('deviceId', id);
  }
  return id;
}

// Claims the logged-in account for this device. False only when the
// server says another device is actively using it. If the server can't be
// asked (offline, for instance) the answer is true: not being able to
// check must never lock someone out of their own data.
async function claimSession() {
  try {
    const deviceId = await getDeviceId();
    const { data, error } = await supabase.rpc('shopper_claim_session', {
      p_device_id: deviceId,
    });
    return error ? true : data !== false;
  } catch {
    return true;
  }
}

async function releaseSession() {
  try {
    await supabase.rpc('shopper_release_session', { p_device_id: await getDeviceId() });
  } catch {
    // offline: the hold simply expires on its own.
  }
}

/** An error whose `message` is already written for the user, in Indonesian. */
export class AuthError extends Error {}

/**
 * Thrown by signIn when the account is active on another browser or
 * device. The login screen asks the user whether to take it over, and if
 * so calls signIn again with `takeOver`.
 */
export class ActiveElsewhereError extends AuthError {
  constructor() {
    super('Akun ini sedang aktif di browser/perangkat lain.');
  }
}

// Supabase and the shopper_* functions report failures as codes or
// English sentences; these are what the user sees instead.
function toAuthError(error: unknown): AuthError {
  const e = error as { message?: string; code?: string; status?: number } | null;
  const text = `${e?.code ?? ''} ${e?.message ?? ''}`.toLowerCase();
  const has = (...needles: string[]) => needles.some((n) => text.includes(n));

  if (has('invalid login credentials', 'invalid_credentials'))
    return new AuthError('Email atau password salah. Coba lagi.');
  if (has('email not confirmed', 'email_not_confirmed'))
    return new AuthError('Email belum dikonfirmasi. Cek inbox kamu, lalu login lagi.');
  if (has('already registered', 'user_already_exists', 'email_exists'))
    return new AuthError('Email ini sudah terdaftar. Silakan login.');
  if (has('weak_password', 'password should be at least'))
    return new AuthError('Password minimal 6 karakter.');
  if (has('same_password')) return new AuthError('Password baru harus berbeda dari yang lama.');
  if (has('invalid_email', 'unable to validate email', 'email address'))
    return new AuthError('Alamat email tidak valid.');
  if (has('rate limit', 'over_email_send_rate_limit', 'too many'))
    return new AuthError('Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.');
  if (has('insufficient_tokens'))
    return new AuthError('Token tidak cukup. Beli token dulu di Pengaturan Subscription.');
  if (has('beta_no_invites'))
    return new AuthError('Menambah anggota akan tersedia saat Justipers versi lengkap dirilis.');
  if (has('member_limit'))
    return new AuthError(`Toko ini sudah mencapai batas ${MEMBER_LIMIT} anggota.`);
  if (has('already_member')) return new AuthError('Email ini sudah menjadi anggota sebuah toko.');
  if (has('already_invited')) return new AuthError('Email ini sudah diundang.');
  if (has('is_owner')) return new AuthError('Pemilik toko tidak bisa dihapus.');
  if (has('is_admin'))
    return new AuthError(
      'Admin tidak bisa dihapus. Minta pemilik toko mencabut status admin dulu.'
    );
  if (has('not_admin')) return new AuthError('Hanya admin yang bisa memakai token toko.');
  if (has('not_owner')) return new AuthError('Hanya pemilik toko yang bisa melakukan ini.');
  if (has('failed to fetch', 'network request failed', 'networkerror', 'load failed'))
    return new AuthError('Tidak bisa terhubung ke server. Cek koneksi internet, lalu coba lagi.');
  return new AuthError('Terjadi kesalahan. Coba lagi sebentar lagi.');
}

// Supabase calls resolve to `{ data, error }` rather than throwing; this
// turns an error into a thrown AuthError and returns the success data.
function check<R extends { data: unknown; error: unknown }>(
  result: R
): Extract<R, { error: null }>['data'] {
  if (result.error) throw toAuthError(result.error);
  return result.data as Extract<R, { error: null }>['data'];
}

async function loadShopState(userId: string): Promise<ShopState | null> {
  // RLS limits each of these to the caller's own shop.
  const shops = check(
    await supabase
      .from('shops')
      .select('id, name, telepon, admin_whatsapp, publikasi_opening, token_balance')
      .limit(1)
  );
  const row = shops?.[0];
  if (!row) return null;
  const members = check(
    await supabase.from('shop_members').select('user_id, role, nama, email').order('created_at')
  );
  const invites = check(
    await supabase.from('shop_invites').select('id, email').order('created_at')
  );
  const charges = check(await supabase.from('shop_event_charges').select('event_id, kind, tokens, refunded_at'));
  const prices = check(await supabase.from('shopper_token_prices').select('kind, tokens'));
  const price = (kind: string, fallback: number) =>
    (prices ?? []).find((p) => p.kind === kind)?.tokens ?? fallback;
  const mine = (members ?? []).find((m) => m.user_id === userId);
  return {
    shop: {
      id: row.id,
      name: row.name,
      telepon: row.telepon,
      adminWhatsapp: row.admin_whatsapp,
      publikasiOpening: row.publikasi_opening,
      tokenBalance: row.token_balance ?? 0,
    },
    role: toRole(mine?.role),
    members: (members ?? []).map((m) => ({
      userId: m.user_id,
      role: toRole(m.role),
      nama: m.nama,
      email: m.email,
    })),
    invites: (invites ?? []).map((i) => ({ id: i.id, email: i.email })),
    charges: {
      opened: (charges ?? []).filter((c) => c.kind === 'open').map((c) => c.event_id),
      published: (charges ?? []).filter((c) => c.kind === 'publish').map((c) => c.event_id),
      openedPaid: (charges ?? [])
        .filter((c) => c.kind === 'open' && c.tokens > 0 && !c.refunded_at)
        .map((c) => c.event_id),
    },
    prices: {
      openEvent: price('open_event', LIST_PRICES.openEvent),
      publishEvent: price('publish_event', LIST_PRICES.publishEvent),
      memberSlot: price('member_slot', LIST_PRICES.memberSlot),
    },
  };
}

function toRole(value: unknown): Role {
  return value === 'owner' || value === 'admin' ? value : 'member';
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const settings = useSettings();
  const eventsStore = useEvents();
  const [session, setSession] = React.useState<Session | null>(null);
  const [sessionRead, setSessionRead] = React.useState(false);
  const [state, setState] = React.useState<ShopState | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  // The effects below outlive renders; read the stores through a ref.
  const stores = React.useRef({ settings, eventsStore });
  stores.current = { settings, eventsStore };

  // Fills lib/settings-store.tsx (what the rest of the app reads) from
  // the server's copy of the shop.
  const applyToSettings = React.useCallback((next: ShopState, user: Session['user']) => {
    const { settings: s } = stores.current;
    const me = next.members.find((m) => m.userId === user.id);
    s.setUserProfile({
      nama: me?.nama ?? '',
      namaJastip: next.shop.name,
      email: user.email ?? '',
      // Never held on the device any more; the field only remains
      // because other screens still share this type.
      password: '',
      telepon: next.shop.telepon,
    });
    s.setAdminWhatsapp(next.shop.adminWhatsapp);
    s.setPublikasiOpening(next.shop.publikasiOpening);
  }, []);

  // Makes sure the user has a shop (creating it, or joining the one they
  // were invited to, on first login), then loads it.
  const establish = React.useCallback(
    async (current: Session) => {
      const meta = (current.user.user_metadata ?? {}) as Record<string, unknown>;
      check(
        await supabase.rpc('shopper_bootstrap', {
          p_nama: typeof meta.nama === 'string' ? meta.nama : '',
          p_shop_name: typeof meta.nama_jastip === 'string' ? meta.nama_jastip : '',
          // Plans are gone (0007); the server ignores this.
          p_plan: '',
        })
      );
      const next = await loadShopState(current.user.id);
      if (!next) throw new AuthError('Toko tidak ditemukan untuk akun ini.');

      // A device remembers which shop the events and orders it holds
      // belong to, because components/data-sync.tsx uploads whatever is
      // on the device into the logged-in shop.
      //   - Same shop as before: keep everything.
      //   - A different shop: start clean, so one shop's orders are never
      //     uploaded into another.
      //   - No shop recorded yet (data from before accounts existed): the
      //     owner adopts it into their shop; an invited member doesn't,
      //     since leftovers on their device aren't the shop's data.
      const localShopId = await storage.get<string | null>('localShopId', null);
      const foreign = localShopId ? localShopId !== next.shop.id : next.role !== 'owner';
      if (foreign) {
        stores.current.eventsStore.resetEvents();
        stores.current.settings.resetBusinessSettings();
        await resetSyncState();
      }
      await storage.set('localShopId', next.shop.id);

      await storage.set('authShopCache', next);
      setState(next);
      applyToSettings(next, current.user);
      return next;
    },
    [applyToSettings]
  );

  // Read the saved session once the local stores have loaded.
  React.useEffect(() => {
    if (!settings.ready || !eventsStore.ready || sessionRead) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      let current = data.session;
      // "Tetap masuk" was not ticked at the last login: the session ends
      // when the app is closed.
      if (current && !stores.current.settings.keepLoggedIn) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        current = null;
      }
      // Another device took over while this one was closed.
      if (current && !(await claimSession())) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        await storage.set('authShopCache', null);
        current = null;
        setNotice(LOGGED_OUT_ELSEWHERE);
      }
      if (cancelled) return;
      if (current) {
        setSession(current);
        // Show the last known shop straight away (and when offline), then
        // refresh it from the server.
        const cached = await storage.get<ShopState | null>('authShopCache', null);
        // Caches written before tokens existed lack the newer fields.
        if (cached && !cancelled)
          setState({
            ...cached,
            shop: { ...cached.shop, tokenBalance: cached.shop.tokenBalance ?? 0 },
            charges: { ...NO_CHARGES, ...cached.charges },
            prices: cached.prices ?? LIST_PRICES,
          });
        establish(current).catch(() => {});
      }
      setSessionRead(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [settings.ready, eventsStore.ready, sessionRead, establish]);

  // Keep the session object current as tokens refresh in the background.
  React.useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') setSession(next);
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setState(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // While logged in, keep renewing this device's hold on the account. If
  // the server says another device has it, this one is logged out.
  const hasSession = session !== null;
  const tokenRef = React.useRef<string | null>(null);
  tokenRef.current = session?.access_token ?? null;
  React.useEffect(() => {
    if (!hasSession) return;
    let stopped = false;
    const beat = async () => {
      if (stopped || (await claimSession()) || stopped) return;
      stopped = true;
      stores.current.settings.signOut();
      await storage.set('authShopCache', null);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setNotice(LOGGED_OUT_ELSEWHERE);
      setSession(null);
      setState(null);
    };
    const timer = setInterval(beat, HEARTBEAT_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') beat();
    });
    // Without "Tetap masuk" the session ends when the tab closes, so give
    // the account up at that moment rather than making another device
    // wait out the timeout. `keepalive` lets the request outlive the page.
    const onPageHide = async () => {
      if (stores.current.settings.keepLoggedIn) return;
      const token = tokenRef.current;
      if (!token) return;
      fetch(`${SUPABASE_URL}/rest/v1/rpc/shopper_release_session`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_device_id: await getDeviceId() }),
      }).catch(() => {});
    };
    if (Platform.OS === 'web') window.addEventListener('pagehide', onPageHide);
    return () => {
      stopped = true;
      clearInterval(timer);
      subscription.remove();
      if (Platform.OS === 'web') window.removeEventListener('pagehide', onPageHide);
    };
  }, [hasSession]);

  const refresh = React.useCallback(async () => {
    if (!session) return;
    const next = await loadShopState(session.user.id);
    if (!next) return;
    await storage.set('authShopCache', next);
    setState(next);
    applyToSettings(next, session.user);
  }, [session, applyToSettings]);

  const signUp = React.useCallback<AuthContextValue['signUp']>(
    async (input) => {
      const data = check(
        await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          // Kept with the account so the shop can be created at first
          // login even when email confirmation delays it.
          options: {
            data: { nama: input.nama, nama_jastip: input.namaJastip },
          },
        })
      );
      if (!data.session) return 'confirm_email';
      await claimSession();
      setNotice(null);
      stores.current.settings.signIn(true);
      setSession(data.session);
      try {
        await establish(data.session);
      } catch (error) {
        throw toAuthError(error);
      }
      return 'signed_in';
    },
    [establish]
  );

  const signIn = React.useCallback<AuthContextValue['signIn']>(
    async (email, password, remember, takeOver = false) => {
      const data = check(await supabase.auth.signInWithPassword({ email, password }));
      // One active browser per account. Unless the user has agreed to
      // take the account over, refuse this login if another device is
      // using it, leaving that device's session untouched.
      if (takeOver) {
        const result = await supabase.rpc('shopper_take_over_session', {
          p_device_id: await getDeviceId(),
        });
        if (result.error) {
          await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          throw toAuthError(result.error);
        }
      } else if (!(await claimSession())) {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        throw new ActiveElsewhereError();
      }
      setNotice(null);
      stores.current.settings.signIn(remember);
      setSession(data.session);
      try {
        await establish(data.session);
      } catch (error) {
        throw error instanceof AuthError ? error : toAuthError(error);
      }
    },
    [establish]
  );

  const signOut = React.useCallback(async () => {
    stores.current.settings.signOut();
    await storage.set('authShopCache', null);
    // Let another device log in straight away.
    await releaseSession();
    // 'local': end the session on this device even when offline.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    setSession(null);
    setState(null);
  }, []);

  const updateShop = React.useCallback<AuthContextValue['updateShop']>(
    async (patch) => {
      if (!state) throw new AuthError('Kamu belum login.');
      const columns: Record<string, string> = {};
      if (patch.name !== undefined) columns.name = patch.name;
      if (patch.telepon !== undefined) columns.telepon = patch.telepon;
      if (patch.adminWhatsapp !== undefined) columns.admin_whatsapp = patch.adminWhatsapp;
      if (patch.publikasiOpening !== undefined) columns.publikasi_opening = patch.publikasiOpening;
      check(await supabase.from('shops').update(columns).eq('id', state.shop.id).select('id'));
      await refresh();
    },
    [state, refresh]
  );

  const call = React.useCallback(
    async (fn: string, args: Record<string, unknown>) => {
      check(await supabase.rpc(fn, args));
      await refresh();
    },
    [refresh]
  );

  const value = React.useMemo<AuthContextValue>(
    () => ({
      ready: sessionRead,
      notice,
      clearNotice: () => setNotice(null),
      signedIn: session !== null,
      email: session?.user.email ?? '',
      userId: session?.user.id ?? null,
      shop: state?.shop ?? null,
      role: state?.role ?? null,
      isAdmin: state?.role === 'owner' || state?.role === 'admin',
      members: state?.members ?? [],
      invites: state?.invites ?? [],
      charges: state?.charges ?? NO_CHARGES,
      prices: state?.prices ?? LIST_PRICES,
      beta: isBeta(state?.prices ?? LIST_PRICES),
      signUp,
      signIn,
      signOut,
      updateShop,
      updateMyName: (nama) => call('shopper_update_my_name', { p_nama: nama }),
      changePassword: async (password) => {
        check(await supabase.auth.updateUser({ password }));
      },
      openEvent: (eventId) => call('shopper_open_event', { p_event_id: eventId }),
      publishEvent: (eventId) => call('shopper_publish_event', { p_event_id: eventId }),
      refundEvent: async (eventId) => {
        const refunded = check(await supabase.rpc('shopper_refund_event', { p_event_id: eventId }));
        await refresh();
        return refunded === true;
      },
      buyMemberSlot: (email) => call('shopper_buy_member_slot', { p_email: email }),
      setAdmin: (userId, admin) => call('shopper_set_admin', { p_user_id: userId, p_admin: admin }),
      cancelInvite: (inviteId) => call('shopper_cancel_invite', { p_invite_id: inviteId }),
      removeMember: (userId) => call('shopper_remove_member', { p_user_id: userId }),
      loadTokenHistory: async () => {
        const rows = check(
          await supabase
            .from('shop_token_ledger')
            .select('id, delta, balance_after, kind, event_id, email, note, created_at')
            .order('created_at', { ascending: false })
            .limit(50)
        );
        return (rows ?? []).map((r) => ({
          id: r.id,
          delta: r.delta,
          balanceAfter: r.balance_after,
          kind: r.kind,
          eventId: r.event_id,
          email: r.email,
          note: r.note,
          createdAt: r.created_at,
        }));
      },
    }),
    [sessionRead, notice, session, state, signUp, signIn, signOut, updateShop, call, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export { AuthProvider, useAuth };
