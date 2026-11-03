// Shared by the Midtrans Edge Functions (midtrans-create, midtrans-notify).
//
// The keys live only in this project's Edge Function secrets
// (Supabase dashboard → Edge Functions → Secrets): MIDTRANS_SERVER_KEY
// for calling Midtrans, MIDTRANS_SIGNATURE_KEY for checking its
// notifications.
// Sandbox keys start with "SB-", so the same code talks to Midtrans's
// sandbox or production depending on which key is stored.

import { createClient } from 'npm:@supabase/supabase-js@2';

export function serverKey() {
  const key = Deno.env.get('MIDTRANS_SERVER_KEY');
  if (!key) throw new Error('MIDTRANS_SERVER_KEY is not set');
  return key;
}

/**
 * What Midtrans signs its notifications with. Newer accounts have a
 * separate "Signature Secret Key" (Access Keys page), stored as
 * MIDTRANS_SIGNATURE_KEY; older ones sign with the server key itself.
 */
export function signatureKey() {
  return Deno.env.get('MIDTRANS_SIGNATURE_KEY') || serverKey();
}

export function isSandbox() {
  return serverKey().startsWith('SB-');
}

/**
 * Sandbox payments are fake money (anyone can "pay" with Midtrans's
 * public simulator), so while the sandbox key is stored only these
 * accounts may buy: MIDTRANS_SANDBOX_TESTERS, comma-separated emails.
 * Unset means nobody. Ignored with a production key.
 */
export function mayBuy(email: string | undefined) {
  if (!isSandbox()) return true;
  const testers = (Deno.env.get('MIDTRANS_SANDBOX_TESTERS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return !!email && testers.includes(email.toLowerCase());
}

export function snapUrl() {
  return isSandbox()
    ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
    : 'https://app.midtrans.com/snap/v1/transactions';
}

export function apiUrl() {
  return isSandbox() ? 'https://api.sandbox.midtrans.com' : 'https://api.midtrans.com';
}

/** HTTP Basic auth as Midtrans wants it: the server key, empty password. */
export function authHeader() {
  return `Basic ${btoa(`${serverKey()}:`)}`;
}

/** Service-role client: bypasses RLS, so only ever used server-side. */
export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('Supabase env is missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function sha512Hex(text: string) {
  const digest = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

// The app calls midtrans-create from the browser, so it needs CORS.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
