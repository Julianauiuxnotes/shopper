-- Justipers tokens: replaces the Solo/Team plans.
--
-- A shop holds a balance of Justipers tokens (1 token = IDR 4,000; sold in
-- bundles once a payment gateway is connected). Tokens are spent on:
--   - opening an event ("Buka event")            1 token
--   - publishing an event's order form           1 token, once per event
--   - a member slot (inviting one email)         5 tokens, one-time
-- New shops start with 3 free tokens, and so does every existing shop.
--
-- Rules, all enforced here rather than in the app:
--   - Only admins spend tokens. The owner is always an admin; the owner
--     can make any member an admin, with no limit on how many.
--   - The owner can never be removed. An admin can't be removed until the
--     owner takes their admin role away.
--   - A member slot belongs to the invited email. It can't be changed or
--     moved to someone else, and removing the member or cancelling the
--     invite gives nothing back.
--   - At most 10 people besides the owner (members plus pending invites).
--   - Deleting an event refunds its "Buka event" token only while the
--     event has no orders and its start date hasn't arrived.
--
-- Every change to a balance is written to shop_token_ledger, which the app
-- shows as the shop's token history.
--
-- Topping up by hand until payments exist (run in the SQL Editor):
--   select public.shopper_apply_tokens(m.shop_id, 10, 'purchase', null, null, 'Top up manual')
--   from public.shop_members m where m.email = 'owner@example.com';

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

alter table public.shops
  add column token_balance integer not null default 0 check (token_balance >= 0);

-- `plan` is no longer read by the app; it stays only so older rows keep
-- their history.
comment on column public.shops.plan is 'Unused since 0007 (tokens replaced plans).';

alter table public.shop_members drop constraint shop_members_role_check;
alter table public.shop_members
  add constraint shop_members_role_check check (role in ('owner', 'admin', 'member'));

create table public.shop_token_ledger (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  delta integer not null check (delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  kind text not null check (
    kind in ('bonus', 'purchase', 'open_event', 'publish_event', 'member_slot', 'refund_event', 'adjustment')
  ),
  event_id text,
  email text,
  user_id uuid references auth.users (id) on delete set null,
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create index shop_token_ledger_shop_idx on public.shop_token_ledger (shop_id, created_at desc);

-- Which events have been paid for. 'open' = the event itself, 'publish' =
-- its customer order form. One row each, so paying twice is impossible.
create table public.shop_event_charges (
  shop_id uuid not null references public.shops (id) on delete cascade,
  event_id text not null check (char_length(event_id) between 1 and 80),
  kind text not null check (kind in ('open', 'publish')),
  charged_at timestamptz not null default now(),
  refunded_at timestamptz,
  primary key (shop_id, event_id, kind)
);

alter table public.shop_token_ledger enable row level security;
alter table public.shop_event_charges enable row level security;

revoke all on table public.shop_token_ledger, public.shop_event_charges from anon, authenticated;
grant select on table public.shop_token_ledger, public.shop_event_charges to authenticated;

create policy "members read their shop's token history" on public.shop_token_ledger
  for select to authenticated using (shop_id = public.shopper_my_shop_id());
create policy "members read their shop's event charges" on public.shop_event_charges
  for select to authenticated using (shop_id = public.shopper_my_shop_id());

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- Adds (or, with a negative p_delta, takes) tokens and records it.
-- Internal: clients can't call it; the functions below and the SQL
-- Editor (manual top-ups) can.
create function public.shopper_apply_tokens(
  p_shop uuid,
  p_delta integer,
  p_kind text,
  p_event_id text,
  p_email text,
  p_note text
) returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  select s.token_balance into v_balance from public.shops s where s.id = p_shop for update;
  if v_balance is null then
    raise exception 'no_shop';
  end if;
  if v_balance + p_delta < 0 then
    raise exception 'insufficient_tokens';
  end if;
  v_balance := v_balance + p_delta;
  update public.shops set token_balance = v_balance where id = p_shop;
  insert into public.shop_token_ledger (shop_id, delta, balance_after, kind, event_id, email, user_id, note)
  values (p_shop, p_delta, v_balance, p_kind, p_event_id, p_email, auth.uid(), coalesce(p_note, ''));
  return v_balance;
end;
$$;

-- The caller's role in their shop, or null.
create function public.shopper_my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role from public.shop_members m where m.user_id = auth.uid();
$$;

-- The caller's shop, but only when they are its owner or an admin.
create function public.shopper_my_admin_shop_id()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_shop_id();
begin
  if v_shop is null then
    raise exception 'no_shop';
  end if;
  if public.shopper_my_role() not in ('owner', 'admin') then
    raise exception 'not_admin';
  end if;
  return v_shop;
end;
$$;

-- ---------------------------------------------------------------------
-- Spending
-- ---------------------------------------------------------------------

-- "Buka event". Called before the app creates the event, with the id the
-- event will have. Calling it again for the same id charges nothing.
-- Returns the new balance.
create function public.shopper_open_event(p_event_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_admin_shop_id();
begin
  if char_length(coalesce(p_event_id, '')) not between 1 and 80 then
    raise exception 'invalid_event';
  end if;
  insert into public.shop_event_charges (shop_id, event_id, kind)
  values (v_shop, p_event_id, 'open')
  on conflict do nothing;
  if not found then
    return (select s.token_balance from public.shops s where s.id = v_shop);
  end if;
  return public.shopper_apply_tokens(v_shop, -1, 'open_event', p_event_id, null, '');
end;
$$;

-- Publishing an event's customer order form: once per event; publishing
-- again (after editing the event, for instance) is free.
create function public.shopper_publish_event(p_event_id text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_admin_shop_id();
begin
  if not exists (
    select 1 from public.shop_event_charges c
    where c.shop_id = v_shop and c.event_id = p_event_id and c.kind = 'open'
  ) then
    raise exception 'invalid_event';
  end if;
  insert into public.shop_event_charges (shop_id, event_id, kind)
  values (v_shop, p_event_id, 'publish')
  on conflict do nothing;
  if not found then
    return (select s.token_balance from public.shops s where s.id = v_shop);
  end if;
  return public.shopper_apply_tokens(v_shop, -1, 'publish_event', p_event_id, null, '');
end;
$$;

-- Called when an event is deleted. Gives its "Buka event" token back when
-- the event has no orders and hasn't started yet; returns whether it did.
-- Any member may call it: it can only ever return the shop's own token.
create function public.shopper_refund_event(p_event_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_shop_id();
  v_start text;
begin
  if v_shop is null then
    raise exception 'no_shop';
  end if;

  perform 1 from public.shop_event_charges c
  where c.shop_id = v_shop and c.event_id = p_event_id and c.kind = 'open' and c.refunded_at is null
  for update;
  if not found then
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

  -- The event may not have reached the server yet; then there is no date
  -- to check, and it was only just opened.
  select e.data ->> 'tanggalDari' into v_start
  from public.shop_events e
  where e.shop_id = v_shop and e.id = p_event_id
    and coalesce((e.data ->> 'deleted')::boolean, false) = false;
  if v_start is not null and v_start::timestamptz <= now() then
    return false;
  end if;

  update public.shop_event_charges set refunded_at = now()
  where shop_id = v_shop and event_id = p_event_id and kind = 'open';
  perform public.shopper_apply_tokens(v_shop, 1, 'refund_event', p_event_id, null, '');
  return true;
end;
$$;

-- An event row can only be created on the server once it has been paid
-- for, so the charge can't be skipped by writing to the table directly.
-- Deletion markers are always allowed. (A BEFORE INSERT trigger also runs
-- for upserts of existing rows, which is why existing events are recorded
-- as paid below.)
create function public.shopper_require_paid_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((new.data ->> 'deleted')::boolean, false) then
    return new;
  end if;
  if not exists (
    select 1 from public.shop_event_charges c
    where c.shop_id = new.shop_id and c.event_id = new.id and c.kind = 'open'
  ) then
    raise exception 'event_not_paid';
  end if;
  return new;
end;
$$;

create trigger shop_events_require_paid before insert on public.shop_events
  for each row execute function public.shopper_require_paid_event();

-- ---------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------

-- Buys a member slot for one email and invites it. 5 tokens, no refunds:
-- the slot can't be changed to another email later.
create function public.shopper_buy_member_slot(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_admin_shop_id();
  v_email text := lower(btrim(coalesce(p_email, '')));
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
  perform public.shopper_apply_tokens(v_shop, -5, 'member_slot', null, v_email, '');
  return v_id;
end;
$$;

-- Owner only: make a member an admin, or take it away.
create function public.shopper_set_admin(p_user_id uuid, p_admin boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_shop_id();
begin
  if v_shop is null or public.shopper_my_role() <> 'owner' then
    raise exception 'not_owner';
  end if;
  update public.shop_members
  set role = case when p_admin then 'admin' else 'member' end
  where shop_id = v_shop and user_id = p_user_id and role in ('admin', 'member');
end;
$$;

-- Replaces the 0002 versions: admins (not only the owner) manage invites
-- and members now, and admins themselves can't be removed.
create or replace function public.shopper_cancel_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_admin_shop_id();
begin
  delete from public.shop_invites i where i.id = p_invite_id and i.shop_id = v_shop;
end;
$$;

create or replace function public.shopper_remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_admin_shop_id();
  v_role text;
begin
  select m.role into v_role from public.shop_members m
  where m.shop_id = v_shop and m.user_id = p_user_id;
  if v_role = 'owner' then
    raise exception 'is_owner';
  end if;
  if v_role = 'admin' then
    raise exception 'is_admin';
  end if;
  delete from public.shop_members where shop_id = v_shop and user_id = p_user_id and role = 'member';
end;
$$;

-- Replaces the 0002 version: no plan any more, and a new shop starts with
-- 3 free tokens. p_plan is kept (and ignored) so older app versions can
-- still call it.
create or replace function public.shopper_bootstrap(p_nama text, p_shop_name text, p_plan text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_shop uuid;
  v_invite uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select m.shop_id into v_shop from public.shop_members m where m.user_id = v_uid;
  if v_shop is not null then
    return v_shop;
  end if;

  select i.id, i.shop_id into v_invite, v_shop
  from public.shop_invites i where i.email = v_email;

  if v_invite is not null then
    insert into public.shop_members (shop_id, user_id, role, nama, email)
    values (v_shop, v_uid, 'member', left(coalesce(p_nama, ''), 80), v_email);
    delete from public.shop_invites where id = v_invite;
    return v_shop;
  end if;

  insert into public.shops (owner_id, name)
  values (v_uid, left(coalesce(nullif(btrim(p_shop_name), ''), 'Jastip'), 80))
  returning id into v_shop;

  insert into public.shop_members (shop_id, user_id, role, nama, email)
  values (v_shop, v_uid, 'owner', left(coalesce(p_nama, ''), 80), v_email);

  perform public.shopper_apply_tokens(v_shop, 3, 'bonus', null, null, 'Token gratis untuk mulai');
  return v_shop;
end;
$$;

drop function public.shopper_set_plan(text);
drop function public.shopper_invite_member(text);

-- ---------------------------------------------------------------------
-- Existing data
-- ---------------------------------------------------------------------

-- Events that already exist were opened (and their forms shared) before
-- tokens: record them as paid so they keep syncing and their links stay.
insert into public.shop_event_charges (shop_id, event_id, kind)
select e.shop_id, e.id, k.kind
from public.shop_events e cross join (values ('open'), ('publish')) as k (kind)
on conflict do nothing;

-- Every existing shop gets the same 3 free tokens as a new one.
select public.shopper_apply_tokens(s.id, 3, 'bonus', null, null, 'Token gratis untuk mulai')
from public.shops s;

-- ---------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------

-- Supabase grants new functions to anon and authenticated by default.
revoke execute on function
  public.shopper_apply_tokens(uuid, integer, text, text, text, text),
  public.shopper_require_paid_event()
from public, anon, authenticated;

revoke execute on function
  public.shopper_my_role(),
  public.shopper_my_admin_shop_id(),
  public.shopper_open_event(text),
  public.shopper_publish_event(text),
  public.shopper_refund_event(text),
  public.shopper_buy_member_slot(text),
  public.shopper_set_admin(uuid, boolean)
from public, anon;

grant execute on function
  public.shopper_my_role(),
  public.shopper_my_admin_shop_id(),
  public.shopper_open_event(text),
  public.shopper_publish_event(text),
  public.shopper_refund_event(text),
  public.shopper_buy_member_slot(text),
  public.shopper_set_admin(uuid, boolean)
to authenticated;
