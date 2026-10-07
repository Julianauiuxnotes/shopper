// The app's one piece of backend: a Supabase project that holds customer
// order-form submissions until the jastiper's app collects them (see
// supabase/migrations/0001_shopper_order_submissions.sql and
// lib/order-inbox.ts). Everything else is still stored on-device.
//
// Both values are public by design — the publishable key only allows
// calling the `shopper_*` functions, which do their own access checks —
// so they live in code rather than in a secret store. Set
// EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY to point a build at
// a different project.
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://wdwpadrujmawtszekwcf.supabase.co';
const SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY ?? 'sb_publishable_07a-bKsjQfSQSuH-Vi9cjQ_c_fktXxc';

export { SUPABASE_URL, SUPABASE_KEY };

export const backendConfigured = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;

/**
 * Calls a Postgres function over Supabase's REST API. Plain `fetch`
 * rather than the supabase-js client: three small calls don't justify
 * adding it to the web bundle. Throws on any failure.
 */
export async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!backendConfigured) throw new Error('backend_not_configured');
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`rpc ${fn} failed: ${response.status} ${detail.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}
