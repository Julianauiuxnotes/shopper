// Saves the shop's bank accounts: POST { accounts, password, consent }
// with the owner's session. The only way to change them
// (supabase/migrations/0015): a session alone isn't enough, the owner's
// password is checked again here, so someone who got hold of a logged-in
// device can't quietly swap the account customers transfer into.
//
// - Owner only.
// - The first time accounts are added, `consent: true` is required: the
//   owner accepted the privacy notice in the app; its time is recorded.
// - If RESEND_API_KEY is set, the owner is emailed whenever the accounts
//   change.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { adminClient, corsHeaders, json } from '../_shared/midtrans.ts';

const MAX_ACCOUNTS = 3;

type Account = { bank: string; nomor: string; nama: string };

function validAccounts(value: unknown): Account[] | null {
  if (!Array.isArray(value) || value.length > MAX_ACCOUNTS) return null;
  const accounts: Account[] = [];
  for (const a of value) {
    if (!a || typeof a !== 'object') return null;
    const bank = String((a as Account).bank ?? '').trim();
    const nomor = String((a as Account).nomor ?? '').trim();
    const nama = String((a as Account).nama ?? '').trim();
    if (!bank || bank.length > 40) return null;
    if (!/^\d{5,20}$/.test(nomor)) return null;
    if (!nama || nama.length > 60) return null;
    accounts.push({ bank, nomor, nama });
  }
  return accounts;
}

// Checks the password with a throwaway client, then ends that extra
// session so it doesn't linger.
async function passwordMatches(email: string, password: string) {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const probe = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await probe.auth.signInWithPassword({ email, password });
  if (error || !data.session) return false;
  await adminClient().auth.admin.signOut(data.session.access_token, 'local').catch(() => {});
  return true;
}

async function emailOwner(to: string, shopName: string, accounts: Account[]) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return;
  const list = accounts.length
    ? accounts.map((a) => `• ${a.bank} · ****${a.nomor.slice(-4)} · a.n. ${a.nama}`).join('\n')
    : '• (semua rekening dihapus)';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Justipers <noreply@justipers.com>',
      to,
      subject: `Rekening bank ${shopName} diubah`,
      text:
        `Hai, rekening bank di toko ${shopName} baru saja diubah. Rekening yang tampil di tagihan customer sekarang:\n\n` +
        `${list}\n\nKalau bukan kamu yang mengubahnya, segera ganti password Justipers kamu dan periksa rekening di Pengaturan.\n\n` +
        `Justipers`,
    }),
  }).catch((e) => console.error('email failed', e));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = adminClient();
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (!user?.email) return json({ error: 'not_authenticated' }, 401);

  let body: { accounts?: unknown; password?: unknown; consent?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const accounts = validAccounts(body.accounts);
  if (!accounts) return json({ error: 'bad_accounts' }, 400);

  const { data: member } = await admin
    .from('shop_members')
    .select('shop_id, role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member || member.role !== 'owner') return json({ error: 'not_owner' }, 403);

  const { data: shop } = await admin
    .from('shops')
    .select('name, bank_accounts_consent_at')
    .eq('id', member.shop_id)
    .single();
  const consenting = body.consent === true;
  if (accounts.length > 0 && !shop?.bank_accounts_consent_at && !consenting) {
    return json({ error: 'consent_required' }, 400);
  }

  if (typeof body.password !== 'string' || !(await passwordMatches(user.email, body.password))) {
    return json({ error: 'wrong_password' }, 403);
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from('shops')
    .update({
      bank_accounts: accounts,
      bank_accounts_changed_at: now,
      ...(consenting && !shop?.bank_accounts_consent_at ? { bank_accounts_consent_at: now } : {}),
    })
    .eq('id', member.shop_id);
  if (error) return json({ error: 'server_error' }, 500);

  await emailOwner(user.email, shop?.name ?? 'kamu', accounts);
  return json({ ok: true });
});
