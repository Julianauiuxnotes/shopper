import * as React from 'react';

// In-memory only — resets on app restart. TODO: persist to Supabase once
// the backend (fymscirqwnnlubepymgc.supabase.co) is unpaused/reconnected,
// same as lib/events-store.tsx. Holds the account profile captured at
// Sign Up (Nama, Nama Jastip, Email, Password), editable from
// Pengaturan, plus the Pengaturan Publikasi config (admin WhatsApp
// number + the event-publication opening message template). This store
// just captures the values so the UI/config is ready whenever real
// auth/backend (Supabase) is wired.

type UserProfile = {
  nama: string;
  namaJastip: string;
  email: string;
  password: string;
};

type SettingsContextValue = {
  userProfile: UserProfile;
  setUserProfile: (value: UserProfile) => void;
  signOut: () => void;
  adminWhatsapp: string;
  setAdminWhatsapp: (value: string) => void;
  publikasiOpening: string;
  setPublikasiOpening: (value: string) => void;
};

const SettingsContext = React.createContext<SettingsContextValue | null>(null);

function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = React.useState<UserProfile>({
    nama: '',
    namaJastip: '',
    email: '',
    password: '',
  });
  const [adminWhatsapp, setAdminWhatsapp] = React.useState('');
  const [publikasiOpening, setPublikasiOpening] = React.useState('');

  // Shared by the Pengaturan "Keluar" button and the dashboard drawer's
  // own "Keluar" shortcut — only clears the signed-in identity, not
  // adminWhatsapp/publikasiOpening (app-level config) or the events/orders
  // store (business data, not tied to auth in this prototype).
  function signOut() {
    setUserProfile({ nama: '', namaJastip: '', email: '', password: '' });
  }

  const value = React.useMemo(
    () => ({
      userProfile,
      setUserProfile,
      signOut,
      adminWhatsapp,
      setAdminWhatsapp,
      publikasiOpening,
      setPublikasiOpening,
    }),
    [userProfile, adminWhatsapp, publikasiOpening]
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
