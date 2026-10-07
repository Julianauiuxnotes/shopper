import * as React from 'react';
import { storage } from './storage';

// Persisted on-device via lib/storage.ts (AsyncStorage), same local
// persistence as lib/events-store.tsx and the separate Cashly project's
// own localStorage. TODO: migrate to Supabase once the backend
// (fymscirqwnnlubepymgc.supabase.co) is unpaused/reconnected — this is
// still single-device storage, not a real account system. Holds the
// account profile captured at Sign Up (Nama, Nama Jastip, Email,
// Password), editable from Pengaturan, plus the Pengaturan Publikasi
// config (admin WhatsApp number + the event-publication opening message
// template). This store just captures the values so the UI/config is
// ready whenever real auth/backend (Supabase) is wired — note the
// password is persisted as plain text here, same as it already lived in
// plain memory, acceptable only because this is a local-only prototype
// with no real backend yet.

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
  const [adminWhatsapp, setAdminWhatsapp] = React.useState('');
  const [publikasiOpening, setPublikasiOpening] = React.useState('');
  const [keepLoggedIn, setKeepLoggedIn] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      const savedProfile = await storage.get('userProfile', BLANK_PROFILE);
      const savedWhatsapp = await storage.get('adminWhatsapp', '');
      const savedOpening = await storage.get('publikasiOpening', '');
      setUserProfile(savedProfile);
      setAdminWhatsapp(savedWhatsapp);
      setPublikasiOpening(savedOpening);
      setKeepLoggedIn(await storage.get('keepLoggedIn', false));
      setLogoJastip(await storage.get<string | null>('logoJastip', null));
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

  function resetBusinessSettings() {
    setLogoJastip(null);
    setAdminWhatsapp('');
    setPublikasiOpening('');
  }

  function signIn(remember: boolean) {
    setKeepLoggedIn(remember);
  }

  // Shared by the Pengaturan "Keluar" button and the dashboard drawer's
  // own "Keluar" shortcut. Deliberately does NOT clear userProfile: with
  // no real backend yet, this local profile IS the only copy of the
  // account's credentials (see sign-up.tsx's TODO) — wiping it here would
  // permanently delete the account the user just signed up with, since
  // login.tsx's email/password check has nothing else to compare
  // against. It only drops the "Tetap masuk" flag, so the next app open
  // asks for the password again; once Supabase auth is wired, this is
  // where a real supabase.auth.signOut() call belongs.
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
      adminWhatsapp,
      setAdminWhatsapp,
      publikasiOpening,
      setPublikasiOpening,
      ready,
    }),
    [userProfile, keepLoggedIn, logoJastip, adminWhatsapp, publikasiOpening, ready]
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
