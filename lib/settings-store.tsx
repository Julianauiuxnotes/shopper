import * as React from 'react';
import { createOrderInbox, type OrderInbox } from './order-inbox';
import { storage } from './storage';

// The device's copy of the account and shop settings, persisted via
// lib/storage.ts (AsyncStorage). Screens read names, phone numbers and
// the Pengaturan Publikasi config from here.
//
// Since real accounts arrived, the server is the source of truth for the
// account profile and shop settings: lib/auth-store.tsx fills this store
// after login and after each save. What still lives only here is
// device-local: the logo, the order inbox, and the "Tetap masuk" flag.
// `UserProfile.password` is always '' now; the field remains only because
// the type is shared across screens.

type UserProfile = {
  nama: string;
  namaJastip: string;
  email: string;
  password: string;
  // The jastiper's own contact number, local digits only (the "+62" is
  // a fixed prefix in the UI). Optional: set in Pengaturan, not asked at
  // Sign Up, and missing from profiles saved before this field existed.
  telepon?: string;
};

type SettingsContextValue = {
  userProfile: UserProfile;
  setUserProfile: (value: UserProfile) => void;
  // Set by login.tsx's "Tetap masuk" checkbox. When true, the splash
  // screen (app/index.tsx) skips straight to the dashboard on the next
  // app open instead of asking for the password again.
  keepLoggedIn: boolean;
  signIn: (remember: boolean) => void;
  // Clears the business settings a previous account left on this device
  // (logo, admin WhatsApp, publikasi template). Called at Sign Up,
  // alongside the events store's resetEvents().
  resetBusinessSettings: () => void;
  signOut: () => void;
  // The jastiper's business logo, uploaded in Pengaturan and shown on
  // printed output (components/jastiper-logo.tsx). Stored as a `data:`
  // URI rather than the picker's own URI: on web that one is a `blob:`
  // URL that dies with the tab, so it wouldn't survive a reload.
  logoJastip: string | null;
  setLogoJastip: (value: string | null) => void;
  // Where customers' order-form submissions arrive (lib/order-inbox.ts).
  // Null until the first order-form link is made; ensureOrderInbox()
  // creates it once and it then stays for the life of the account, since
  // links already shared point at it.
  orderInbox: OrderInbox | null;
  ensureOrderInbox: () => Promise<OrderInbox>;
  adminWhatsapp: string;
  setAdminWhatsapp: (value: string) => void;
  publikasiOpening: string;
  setPublikasiOpening: (value: string) => void;
  // True once the persisted values below have finished loading from
  // storage. Screens that keep a local "draft" copy of these values
  // (settings.tsx, pengaturan-publikasi.tsx — `useState(userProfile.nama)`
  // and similar) need this: `useState(initialValue)` only reads its
  // argument on the component's FIRST render, so if that screen happens
  // to mount before this async load resolves, its draft permanently
  // locks in the pre-load empty string and never picks up the real
  // loaded value on its own. Those screens use this flag to re-sync
  // their drafts once, right when loading finishes.
  ready: boolean;
};

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

const BLANK_PROFILE: UserProfile = { nama: '', namaJastip: '', email: '', password: '' };

function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = React.useState<UserProfile>(BLANK_PROFILE);
  const [logoJastip, setLogoJastip] = React.useState<string | null>(null);
  const [orderInbox, setOrderInbox] = React.useState<OrderInbox | null>(null);
  // Shared by concurrent callers so two screens can't each make an inbox.
  const inboxPromise = React.useRef<Promise<OrderInbox> | null>(null);
  const [adminWhatsapp, setAdminWhatsapp] = React.useState('');
  const [publikasiOpening, setPublikasiOpening] = React.useState('');
  const [keepLoggedIn, setKeepLoggedIn] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const savedProfile = await storage.get('userProfile', BLANK_PROFILE);
      const savedWhatsapp = await storage.get('adminWhatsapp', '');
      const savedOpening = await storage.get('publikasiOpening', '');
      // Older versions saved the password here in plain text; drop it.
      setUserProfile({ ...savedProfile, password: '' });
      setAdminWhatsapp(savedWhatsapp);
      setPublikasiOpening(savedOpening);
      setKeepLoggedIn(await storage.get('keepLoggedIn', false));
      setLogoJastip(await storage.get<string | null>('logoJastip', null));
      setOrderInbox(await storage.get<OrderInbox | null>('orderInbox', null));
      setReady(true);
    })();
  }, []);

  React.useEffect(() => {
    if (ready) storage.set('userProfile', userProfile);
  }, [userProfile, ready]);
  React.useEffect(() => {
    if (ready) storage.set('adminWhatsapp', adminWhatsapp);
  }, [adminWhatsapp, ready]);
  React.useEffect(() => {
    if (ready) storage.set('publikasiOpening', publikasiOpening);
  }, [publikasiOpening, ready]);
  React.useEffect(() => {
    if (ready) storage.set('keepLoggedIn', keepLoggedIn);
  }, [keepLoggedIn, ready]);
  React.useEffect(() => {
    if (ready) storage.set('logoJastip', logoJastip);
  }, [logoJastip, ready]);
  React.useEffect(() => {
    if (ready) storage.set('orderInbox', orderInbox);
  }, [orderInbox, ready]);

  const ensureOrderInbox = React.useCallback(() => {
    if (orderInbox) return Promise.resolve(orderInbox);
    inboxPromise.current ??= createOrderInbox().then((inbox) => {
      setOrderInbox(inbox);
      return inbox;
    });
    return inboxPromise.current;
  }, [orderInbox]);

  function resetBusinessSettings() {
    setLogoJastip(null);
    // A new account gets its own inbox; the old account's links stop
    // delivering here.
    setOrderInbox(null);
    inboxPromise.current = null;
    setAdminWhatsapp('');
    setPublikasiOpening('');
  }

  function signIn(remember: boolean) {
    setKeepLoggedIn(remember);
  }

  // Drops the "Tetap masuk" flag. Called by lib/auth-store.tsx's signOut,
  // which also ends the server session.
  function signOut() {
    setKeepLoggedIn(false);
  }

  const value = React.useMemo(
    () => ({
      userProfile,
      setUserProfile,
      keepLoggedIn,
      signIn,
      resetBusinessSettings,
      signOut,
      logoJastip,
      setLogoJastip,
      orderInbox,
      ensureOrderInbox,
      adminWhatsapp,
      setAdminWhatsapp,
      publikasiOpening,
      setPublikasiOpening,
      ready,
    }),
    [
      userProfile,
      keepLoggedIn,
      logoJastip,
      orderInbox,
      ensureOrderInbox,
      adminWhatsapp,
      publikasiOpening,
      ready,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

function useSettings() {
  const ctx = React.useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}

export { SettingsProvider, useSettings };
export type { UserProfile };
