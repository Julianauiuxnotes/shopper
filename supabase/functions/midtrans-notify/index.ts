// Midtrans's payment notifications (the webhook). Public by necessity:
// Midtrans calls it without a Supabase session, so two checks stand in:
//   1. signature_key must equal SHA-512(order_id + status_code +
//      gross_amount + signature secret key), which only Midtrans can
//      produce (see signatureKey in ../_shared/midtrans.ts);
//   2. the status is then read back from Midtrans's own API, and the
//      amount compared with what was recorded at checkout.
// Only then are tokens added (shopper_credit_token_payment, once per
// order). Midtrans retries until it gets a 2xx, and may send the same
// notification more than once; both are harmless here.

import { adminClient, apiUrl, authHeader, sha512Hex, signatureKey } from '../_shared/midtrans.ts';

const PAID = ['settlement', 'capture'];
const EXPIRED = ['expire'];
const FAILED = ['cancel', 'deny', 'failure'];

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  let note: Record<string, string>;
  try {
    note = await req.json();
  } catch {
    return new Response('bad request', { status: 400 });
  }
  const { order_id: orderId, status_code: statusCode, gross_amount: grossAmount } = note;
  if (!orderId || !statusCode || !grossAmount || !note.signature_key) {
    return new Response('bad request', { status: 400 });
  }

  const expected = await sha512Hex(`${orderId}${statusCode}${grossAmount}${signatureKey()}`);
  if (expected !== note.signature_key) return new Response('bad signature', { status: 403 });

  const admin = adminClient();
  const { data: payment } = await admin
    .from('shop_token_payments')
    .select('order_id, amount, status')
    .eq('order_id', orderId)
    .maybeSingle();
  // Not ours (e.g. the dashboard's "test notification"): acknowledge, so
  // Midtrans stops retrying.
  if (!payment) return new Response('ok');
  if (payment.status === 'paid') return new Response('ok');

  // Trust Midtrans's API, not the notification body.
  const statusResponse = await fetch(`${apiUrl()}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: { Accept: 'application/json', Authorization: authHeader() },
  });
  const status = await statusResponse.json().catch(() => null);
  if (!statusResponse.ok || !status?.transaction_status) {
    console.error('status check failed', orderId, statusResponse.status, JSON.stringify(status));
    // 5xx: Midtrans will try again later.
    return new Response('status check failed', { status: 502 });
  }

  const txStatus: string = status.transaction_status;
  const paymentType: string = status.payment_type ?? '';
  const paidInFull = Math.round(Number(status.gross_amount)) === Math.round(Number(payment.amount));
  // Card payments come back as "capture"; only an accepted one counts.
  const fraudOk = txStatus !== 'capture' || status.fraud_status === 'accept';

  if (PAID.includes(txStatus) && fraudOk) {
    if (!paidInFull) {
      console.error('amount mismatch', orderId, status.gross_amount, payment.amount);
      return new Response('ok');
    }
    const { error } = await admin.rpc('shopper_credit_token_payment', {
      p_order_id: orderId,
      p_midtrans_status: txStatus,
      p_payment_type: paymentType,
    });
    if (error) {
      console.error('credit failed', orderId, error.message);
      return new Response('credit failed', { status: 500 });
    }
  } else if (EXPIRED.includes(txStatus) || FAILED.includes(txStatus)) {
    await admin
      .from('shop_token_payments')
      .update({
        status: EXPIRED.includes(txStatus) ? 'expired' : 'failed',
        midtrans_status: txStatus,
        payment_type: paymentType,
      })
      .eq('order_id', orderId)
      .eq('status', 'pending');
  } else {
    // pending, authorize, …: nothing to do yet.
    await admin
      .from('shop_token_payments')
      .update({ midtrans_status: txStatus, payment_type: paymentType })
      .eq('order_id', orderId)
      .eq('status', 'pending');
  }

  return new Response('ok');
});
