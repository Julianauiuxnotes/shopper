-- Buying tokens online, through Midtrans Snap.
--
-- The flow, all on the server:
--   1. An admin picks a bundle in the app. The Edge Function
--      `midtrans-create` (supabase/functions/midtrans-create) looks the
--      price up in shopper_token_bundles below, never trusting the app,
--      records a pending row in shop_token_payments, and asks Midtrans for
--      a checkout page.
--   2. The customer pays on Midtrans's page (QRIS, GoPay, ShopeePay; bank
--      transfer from the 25-token bundle up).
--   3. Midtrans calls `midtrans-notify`, which checks the signature, asks
--      Midtrans for the real status, and on success calls
--      shopper_credit_token_payment: the tokens are added exactly once per
--      payment, however often Midtrans repeats the notification.
--
-- Only IDR for now: Midtrans charges in rupiah. USD shops keep the
-- "segera hadir" notice until card payments are set up.

-- ---------------------------------------------------------------------
-- Bundle prices
-- ---------------------------------------------------------------------

-- What a bundle costs. Must match TOKEN_BUNDLES in
-- components/token-section.tsx, which only displays them; the price
-- charged always comes from here. Change a price with SQL, e.g.
--   update public.shopper_token_bundles set price = 19000
--   where currency = 'IDR' and tokens = 5;
create table public.shopper_token_bundles (
  currency text not null check (currency in ('IDR', 'USD')),
  tokens integer not null check (tokens > 0),
  price numeric(12, 2) not null check (price > 0),
  primary key (currency, tokens)
);

insert into public.shopper_token_bundles (currency, tokens, price) values
  ('IDR', 5, 20000),
  ('IDR', 10, 37500),
  ('IDR', 25, 87500),
  ('IDR', 50, 160000),
  ('USD', 5, 4.99),
  ('USD', 10, 8.99),
  ('USD', 25, 19.99),
  ('USD', 50, 34.99);

alter table public.shopper_token_bundles enable row level security;
revoke all on table public.shopper_token_bundles from anon, authenticated;
grant select on table public.shopper_token_bundles to authenticated;
create policy "anyone signed in reads bundle prices" on public.shopper_token_bundles
  for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------

-- One row per checkout started. `order_id` is the id Midtrans knows the
-- payment by. Written only by the Edge Functions (service role).
create table public.shop_token_payments (
  order_id text primary key check (char_length(order_id) between 1 and 50),
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  tokens integer not null check (tokens > 0),
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency in ('IDR', 'USD')),
  -- pending: checkout made, not paid yet. paid: tokens added.
  -- expired / failed: never paid (expire, cancel, deny or failure).
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired', 'failed')),
  -- Midtrans's own words: transaction_status and payment_type.
  midtrans_status text,
  payment_type text,
  redirect_url text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index shop_token_payments_shop_idx on public.shop_token_payments (shop_id, created_at desc);

alter table public.shop_token_payments enable row level security;
revoke all on table public.shop_token_payments from anon, authenticated;
grant select on table public.shop_token_payments to authenticated;
create policy "members read their shop's payments" on public.shop_token_payments
  for select to authenticated using (shop_id = public.shopper_my_shop_id());

-- ---------------------------------------------------------------------
-- Crediting a payment
-- ---------------------------------------------------------------------

-- Marks a payment paid and adds its tokens. Safe to call any number of
-- times: only the first call for an order adds anything. Returns true
-- when this call added the tokens. Service role only (midtrans-notify).
create function public.shopper_credit_token_payment(
  p_order_id text,
  p_midtrans_status text,
  p_payment_type text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.shop_token_payments;
begin
  select * into v_payment from public.shop_token_payments p
  where p.order_id = p_order_id for update;
  if v_payment.order_id is null then
    raise exception 'no_payment';
  end if;
  if v_payment.status = 'paid' then
    return false;
  end if;

  update public.shop_token_payments
  set status = 'paid',
      midtrans_status = p_midtrans_status,
      payment_type = p_payment_type,
      paid_at = now()
  where order_id = p_order_id;

  perform public.shopper_apply_tokens(
    v_payment.shop_id, v_payment.tokens, 'purchase', null, null, p_order_id
  );
  return true;
end;
$$;

-- Supabase grants new functions to anon and authenticated by default.
revoke execute on function public.shopper_credit_token_payment(text, text, text)
from public, anon, authenticated;
grant execute on function public.shopper_credit_token_payment(text, text, text) to service_role;
