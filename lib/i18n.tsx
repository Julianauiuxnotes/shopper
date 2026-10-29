import * as React from 'react';
import { en } from './i18n-en';
import { storage } from './storage';

// The app's language. Indonesian is the source: every user-facing string
// is written in Indonesian and wrapped in t(), which looks it up in the
// English dictionary (lib/i18n-en.ts) when English is chosen. A string
// missing from the dictionary shows in Indonesian.
//
// Placeholders are written {name} and filled from t()'s second argument.
// An English entry can be a [singular, plural] pair, picked by the `n`
// parameter ("1 token" / "5 tokens").
//
// The choice belongs to the device (saved through lib/storage.ts), not
// the account. Customer pages (order form, receipt) follow the language
// of the jastiper who made the link instead; see useLinkLanguage().

export type Language = 'id' | 'en';
export type TParams = Record<string, string | number>;

const STORAGE_KEY = 'language';

let current: Language = 'id';
// A customer page's language while it's open. Never saved.
let override: Language | null = null;
const listeners = new Set<() => void>();

function active(): Language {
  return override ?? current;
}

function notify() {
  // Keeps the web page's lang attribute (app/+html.tsx starts it at "id")
  // in step, for screen readers and the browser's own translate offer.
  if (typeof document !== 'undefined') document.documentElement.lang = active();
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function t(text: string, params?: TParams): string {
  let out = text;
  if (active() === 'en') {
    const entry = en[text];
    if (typeof entry === 'string') out = entry;
    else if (entry) out = params?.n === 1 ? entry[0] : entry[1];
  }
  if (!params) return out;
  return out.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

export function getLanguage(): Language {
  return active();
}

/** Reads the saved choice. The root layout waits for it before rendering. */
export async function loadLanguage() {
  const saved = await storage.get<Language | null>(STORAGE_KEY, null);
  if (saved === 'id' || saved === 'en') current = saved;
  notify();
}

export function setLanguage(language: Language) {
  if (language === current) return;
  current = language;
  storage.set(STORAGE_KEY, language);
  notify();
}

/** Re-renders the calling component when the language changes. */
export function useLanguage() {
  const language = React.useSyncExternalStore(subscribe, active, active);
  return { language, setLanguage, t };
}

/** Shorthand for components that only need t(). */
export function useT() {
  return useLanguage().t;
}

/** For customer pages: show the page in the link's language while it's
 * open, without changing the device's own choice. */
export function useLinkLanguage(language: Language | null) {
  React.useEffect(() => {
    override = language;
    notify();
    return () => {
      override = null;
      notify();
    };
  }, [language]);
  return useLanguage();
}

/** The `l` query parameter put on links made in English. */
export function linkLanguageParam() {
  return active() === 'en' ? '?l=en' : '';
}

export function parseLinkLanguage(value: unknown): Language | null {
  return value === 'en' ? 'en' : value === 'id' ? 'id' : null;
}
