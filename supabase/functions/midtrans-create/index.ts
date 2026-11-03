// Starts a token purchase: POST { tokens, returnUrl? } with the user's
// session. Returns { orderId, redirectUrl }; the app sends the user to
// redirectUrl, Midtrans's checkout page. Tokens are added later, by
// midtrans-notify, once Midtrans confirms the payment.
//
// Everything that matters is decided here: who may buy (shop admins),
// the currency (the shop's country) and the price
// (public.shopper_token_bundles). The app only says which bundle.

import {
  adminClient,
  authHeader,
  corsHeaders,
  json,
  mayBuy,
  snapUrl,
} from '../_shared/midtrans.ts';

// Where Midtrans may send the user back to. Anything else falls back to
// the live app, so a crafted request can't bounce users elsewhere.
const RETURN_ORIGINS = [
  'https://app.justipers.com',
  'https://justipers.shopper-appjastiper.workers.dev',
  'http://localhost:8081',
];
const DEFAULT_RETURN = 'https://app.justipers.com/pengaturan-subscription';

// Bank transfer costs a flat fee per payment (about Rp4.000 + PPN), too
// much for the small bundles, so it's offered from this bundle up.
const BANK_TRANSFER_FROM_TOKENS = 25;
const QR_AND_WALLETS = ['other_qris', 'gopay', 'shopeepay'];
const BANK_TRANSFERS = ['bca_va', 'bni_va', 'bri_va', 'echannel', 'permata_va', 'cimb_va', 'other_va'];

// An unpaid checkout lapses after this long.
const EXPIRY_MINUTES = 60;

function returnUrl(requested: unknown) {
  if (typeof requested !== 'string') return DEFAULT_RETURN;
  try {
    const url = new URL(requested);
    return RETURN_ORIGINS.includes(url.origin) ? url.toString() : DEFAULT_RETURN;
  } catch {
    return DEFAULT_RETURN;
  }
}

function newOrderId() {
  // e.g. JTP-MHJ3K2QX-1A2B3C4D: time first, so ids sort by date.
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `JTP-${Date.now().toString(36)}-${random}`.toUpperCase();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = adminClient();

  // Who is asking.
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userError || !user) return json({ error: 'not_authenticated' }, 401);
  if (!mayBuy(user.email)) return json({ error: 'sandbox_testers_only' }, 403);

  let body: { tokens?: unknown; returnUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const tokens = Number(body.tokens);
  if (!Number.isInteger(tokens) || tokens <= 0) return json({ error: 'bad_bundle' }, 400);

  // Only the shop's admins (the owner counts) buy tokens.
  const { data: member } = await admin
    .from('shop_members')
    .select('shop_id, role, nama')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!member) return json({ error: 'no_shop' }, 403);
  if (member.role !== 'owner' && member.role !== 'admin') return json({ error: 'not_admin' }, 403);

  const { data: shop } = await admin
    .from('shops')
    .select('name, country')
    .eq('id', member.shop_id)
    .single();
  const currency = shop?.country && shop.country !== 'ID' ? 'USD' : 'IDR';
  if (currency !== 'IDR') return json({ error: 'currency_not_available' }, 400);

  const { data: bundle } = await admin
    .from('shopper_token_bundles')
    .select('price')
    .eq('currency', currency)
    .eq('tokens', tokens)
    .maybeSingle();
  if (!bundle) return json({ error: 'bad_bundle' }, 400);
  const amount = Math.round(Number(bundle.price));

  const orderId = newOrderId();
  const { error: insertError } = await admin.from('shop_token_payments').insert({
    order_id: orderId,
    shop_id: member.shop_id,
    user_id: user.id,
    tokens,
    amount,
    currency,
  });
  if (insertError) return json({ error: 'server_error' }, 500);

  const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/midtrans-notify`;
  const snapResponse = await fetch(snapUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader(),
      // Midtrans sends this payment's notifications here, whatever the
      // dashboard's Notification URL says.
      'X-Override-Notification': notifyUrl,
    },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      item_details: [
        { id: `token-${tokens}`, price: amount, quantity: 1, name: `${tokens} Justipers token` },
      ],
      customer_details: {
        first_name: (member.nama || shop?.name || 'Justipers').slice(0, 50),
        email: user.email,
      },
      enabled_payments:
        tokens >= BANK_TRANSFER_FROM_TOKENS ? [...QR_AND_WALLETS, ...BANK_TRANSFERS] : QR_AND_WALLETS,
      expiry: { unit: 'minutes', duration: EXPIRY_MINUTES },
      callbacks: { finish: returnUrl(body.returnUrl) },
    }),
  });

  const snap = await snapResponse.json().catch(() => null);
  if (!snapResponse.ok || !snap?.redirect_url) {
    console.error('snap failed', snapResponse.status, JSON.stringify(snap));
    await admin.from('shop_token_payments').update({ status: 'failed' }).eq('order_id', orderId);
    return json({ error: 'gateway_error' }, 502);
  }

  await admin
    .from('shop_token_payments')
    .update({ redirect_url: snap.redirect_url })
    .eq('order_id', orderId);

  return json({ orderId, redirectUrl: snap.redirect_url });
});
