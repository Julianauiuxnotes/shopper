-- Justipers beta: token prices move into a table, and are all 0 for now.
--
-- 0007 hard-coded the prices (Buka event 1, publish 1, member slot 5).
-- They now live in shopper_token_prices, which the app reads, so pricing
-- can change without a new app release. While Justipers is in beta every
-- price is 0: nothing is taken from balances and nothing is written to
-- the token history. Everything else still applies (only admins act,
-- events must be opened through shopper_open_event, 10-member limit).
--
-- To end the beta and start charging (run in the SQL Editor):
--   update public.shopper_token_prices set tokens = 1 where kind in ('open_event', 'publish_event');
--   update public.shopper_token_prices set tokens = 5 where kind = 'member_slot';

create table public.shopper_token_prices (
  kind text primary key check (kind in ('open_event', 'publish_event', 'member_slot')),
  tokens integer not null check (tokens >= 0)
);

insert into public.shopper_token_prices (kind, tokens) values
  ('open_event', 0),
  ('publish_event', 0),
  ('member_slot', 0);

alter table public.shopper_token_prices enable row level security;
revoke all on table public.shopper_token_prices from anon, authenticated;
grant select on table public.shopper_token_prices to authenticated;
create policy "signed-in users read token prices" on public.shopper_token_prices
  for select to authenticated using (true);

-- What each event charge actually cost, so a refund returns exactly that
-- (nothing for events opened free during the beta). Charges made before
-- this migration cost 1 token.
alter table public.shop_event_charges add column tokens integer not null default 1 check (tokens >= 0);
alter table public.shop_event_charges alter column tokens drop default;

create function public.shopper_token_price(p_kind text)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select p.tokens from public.shopper_token_prices p where p.kind = p_kind), 0);
$$;

create or replace function public.shopper_open_event(p_event_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_admin_shop_id();
  v_price integer := public.shopper_token_price('open_event');
begin
  if char_length(coalesce(p_event_id, '')) not between 1 and 80 then
    raise exception 'invalid_event';
  end if;
  insert into public.shop_event_charges (shop_id, event_id, kind, tokens)
  values (v_shop, p_event_id, 'open', v_price)
  on conflict do nothing;
  if not found or v_price = 0 then
    return (select s.token_balance from public.shops s where s.id = v_shop);
  end if;
  return public.shopper_apply_tokens(v_shop, -v_price, 'open_event', p_event_id, null, '');
end;
$$;

create or replace function public.shopper_publish_event(p_event_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_admin_shop_id();
  v_price integer := public.shopper_token_price('publish_event');
begin
  if not exists (
    select 1 from public.shop_event_charges c
    where c.shop_id = v_shop and c.event_id = p_event_id and c.kind = 'open'
  ) then
    raise exception 'invalid_event';
  end if;
  insert into public.shop_event_charges (shop_id, event_id, kind, tokens)
  values (v_shop, p_event_id, 'publish', v_price)
  on conflict do nothing;
  if not found or v_price = 0 then
    return (select s.token_balance from public.shops s where s.id = v_shop);
  end if;
  return public.shopper_apply_tokens(v_shop, -v_price, 'publish_event', p_event_id, null, '');
end;
$$;

-- Same rules as 0007, but returns what the event was opened for, and
-- returns false (nothing to give back) for events opened free.
create or replace function public.shopper_refund_event(p_event_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_shop_id();
  v_tokens integer;
  v_start text;
begin
  if v_shop is null then
    raise exception 'no_shop';
  end if;

  select c.tokens into v_tokens from public.shop_event_charges c
  where c.shop_id = v_shop and c.event_id = p_event_id and c.kind = 'open' and c.refunded_at is null
  for update;
  if not found or v_tokens = 0 then
    return false;
  end if;

  if exists (
    select 1 from public.shop_orders o
    where o.shop_id = v_shop
      and o.event_id = p_event_id
      and coalesce((o.data ->> 'deleted')::boolean, false) = false
  ) then
    return false;
  end if;

  select e.data ->> 'tanggalDari' into v_start
  from public.shop_events e
  where e.shop_id = v_shop and e.id = p_event_id
    and coalesce((e.data ->> 'deleted')::boolean, false) = false;
  if v_start is not null and v_start::timestamptz <= now() then
    return false;
  end if;

  update public.shop_event_charges set refunded_at = now()
  where shop_id = v_shop and event_id = p_event_id and kind = 'open';
  perform public.shopper_apply_tokens(v_shop, v_tokens, 'refund_event', p_event_id, null, '');
  return true;
end;
$$;

create or replace function public.shopper_buy_member_slot(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_admin_shop_id();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_price integer := public.shopper_token_price('member_slot');
  v_id uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    raise exception 'invalid_email';
  end if;
  if exists (select 1 from public.shop_members m where m.email = v_email) then
    raise exception 'already_member';
  end if;
  if exists (select 1 from public.shop_invites i where i.email = v_email) then
    raise exception 'already_invited';
  end if;
  if (select count(*) from public.shop_members m where m.shop_id = v_shop and m.role <> 'owner')
     + (select count(*) from public.shop_invites i where i.shop_id = v_shop) >= 10 then
    raise exception 'member_limit';
  end if;

  insert into public.shop_invites (shop_id, email, invited_by)
  values (v_shop, v_email, auth.uid())
  returning id into v_id;
  if v_price > 0 then
    perform public.shopper_apply_tokens(v_shop, -v_price, 'member_slot', null, v_email, '');
  end if;
  return v_id;
end;
$$;

revoke execute on function public.shopper_token_price(text) from public, anon, authenticated;
