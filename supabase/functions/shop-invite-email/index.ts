// Emails an invited person: POST { email } with an admin's session, right
// after the invite was made (shopper_buy_member_slot), or again from the
// pending invite's "Kirim ulang email" in Pengaturan Subscription.
//
// - Owner or admin of the shop that invited this email only.
// - At most one email per invite every 10 minutes
//   (shop_invites.emailed_at, supabase/migrations/0017).
// - Sent through Resend from noreply@justipers.com; needs the
//   RESEND_API_KEY secret.
//
// The invited person signs up with that address and lands in the shop
// (shopper_bootstrap); the email only tells them so and links to sign-up.

import { adminClient, corsHeaders, json } from '../_shared/midtrans.ts';

const APP_URL = 'https://app.justipers.com';
const RESEND_GAP_MS = 10 * 60 * 1000;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function inviteEmail(to: string, shopName: string, inviter: string) {
  // The sign-up page fills the email in from ?email= and, with ?invite=,
  // shows the short invited form naming the shop (app/sign-up.tsx).
  const link =
    `${APP_URL}/sign-up?invite=1&email=${encodeURIComponent(to)}` +
    `&shop=${encodeURIComponent(shopName)}`;
  const subject = `${inviter} mengundang kamu ke ${shopName} di Justipers`;
  const text =
    `Hai,\n\n${inviter} mengundang kamu bergabung ke toko jastip "${shopName}" di Justipers.\n\n` +
    `Daftar dengan email ini (${to}) lewat link berikut, lalu kamu otomatis masuk ke toko tersebut:\n${link}\n\n` +
    `Kalau kamu tidak mengenal undangan ini, abaikan saja email ini.\n\n` +
    `---\n\n${inviter} invited you to join the jastip shop "${shopName}" on Justipers. ` +
    `Sign up with this email address (${to}) here and you'll be added to the shop:\n${link}\n\n` +
    `Justipers`;
  const s = escapeHtml(shopName);
  const i = escapeHtml(inviter);
  const e = escapeHtml(to);
  const html = `<!doctype html><html><body style="margin:0;background:#fff7ed;font-family:Inter,Arial,sans-serif;color:#262626">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;padding:28px">
<tr><td>
<p style="margin:0 0 4px;font-size:13px;color:#f97316;font-weight:700">Justipers</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">Kamu diundang ke ${s}</h1>
<p style="margin:0 0 12px;font-size:14px;line-height:1.5"><b>${i}</b> mengundang kamu bergabung ke toko jastip <b>${s}</b> di Justipers.</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.5">Daftar dengan email ini (<b>${e}</b>), lalu kamu otomatis masuk ke toko tersebut.</p>
<p style="margin:0 0 20px"><a href="${link}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:12px">Daftar &amp; gabung</a></p>
<p style="margin:0 0 20px;font-size:12px;line-height:1.5;color:#737373">Atau buka: <a href="${link}" style="color:#f97316">${link}</a><br>Kalau kamu tidak mengenal undangan ini, abaikan saja email ini.</p>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:0 0 16px">
<p style="margin:0;font-size:12px;line-height:1.5;color:#737373"><b>${i}</b> invited you to join <b>${s}</b> on Justipers. Sign up with this email address (${e}) and you'll be added to the shop.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, text, html };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return json({ error: 'email_not_configured' }, 503);

  const admin = adminClient();
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (!user) return json({ error: 'not_authenticated' }, 401);

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: 'bad_request' }, 400);

  const { data: member } = await admin
    .from('shop_members')
    .select('shop_id, role, nama, email')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    return json({ error: 'not_admin' }, 403);
  }

  const { data: invite } = await admin
    .from('shop_invites')
    .select('id, emailed_at')
    .eq('shop_id', member.shop_id)
    .eq('email', email)
    .maybeSingle();
  if (!invite) return json({ error: 'no_invite' }, 404);
  if (invite.emailed_at && Date.now() - new Date(invite.emailed_at).getTime() < RESEND_GAP_MS) {
    return json({ error: 'too_soon' }, 429);
  }

  const { data: shop } = await admin.from('shops').select('name').eq('id', member.shop_id).single();
  const shopName = shop?.name || 'Jastip';
  const inviter = (member.nama ?? '').trim() || member.email || user.email || shopName;
  const { subject, text, html } = inviteEmail(email, shopName, inviter);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Justipers <noreply@justipers.com>',
      to: email,
      reply_to: member.email || user.email || undefined,
      subject,
      text,
      html,
    }),
  }).catch((e) => {
    console.error('email failed', e);
    return null;
  });
  if (!res?.ok) {
    console.error('resend error', res?.status, await res?.text().catch(() => ''));
    return json({ error: 'send_failed' }, 502);
  }

  await admin.from('shop_invites').update({ emailed_at: new Date().toISOString() }).eq('id', invite.id);
  return json({ ok: true });
});
