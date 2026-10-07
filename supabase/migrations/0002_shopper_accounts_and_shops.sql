-- Accounts and shops for Shopper (step 1 of the accounts/plans/sync plan).
--
-- A user logs in with Supabase Auth. Data belongs to a SHOP (toko), not
-- to a person: a Solo account is a shop with one member; on Team the
-- owner can invite a second member, who logs in with their own email and
-- password and sees the same shop.
--
-- Prototype scope: one shop per user, one invited member per Team shop,
-- and no invitation email — an invited person simply signs up with the
-- invited address and is attached to the shop.
--
-- Clients can read their own shop's rows directly (RLS). Every write
-- except editing the shop's own settings goes through a function, so the
-- rules (who may invite, seat limit, roles) live in one place.

create table public.shops (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  plan text not null default 'solo' check (plan in ('solo', 'team')),
  telepon text not null default '' check (char_length(telepon) <= 20),
  admin_whatsapp text not null default '' check (char_length(admin_whatsapp) <= 20),
  publikasi_opening text not null default '' check (char_length(publikasi_opening) <= 2000),
  trial_started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.shop_members (
  shop_id uuid not null references public.shops (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  nama text not null default '' check (char_length(nama) <= 80),
  email text not null default '',
  created_at timestamptz not null default now(),
  primary key (shop_id, user_id),
  unique (user_id)
);

create table public.shop_invites (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.shops (id) on delete cascade,
  email text not null unique check (email = lower(email) and char_length(email) between 3 and 254),
  invited_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- The caller's shop. SECURITY DEFINER so the policies below can use it
-- without shop_members' own policy recursing into itself.
create function public.shopper_my_shop_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.shop_id from public.shop_members m where m.user_id = auth.uid();
$$;

alter table public.shops enable row level security;
alter table public.shop_members enable row level security;
alter table public.shop_invites enable row level security;

revoke all on table public.shops, public.shop_members, public.shop_invites from anon, authenticated;
grant select on table public.shops, public.shop_members, public.shop_invites to authenticated;
-- Only these columns are editable directly, and (policy below) only by the owner.
grant update (name, telepon, admin_whatsapp, publikasi_opening) on table public.shops to authenticated;

create policy "members read their shop" on public.shops
  for select to authenticated using (id = public.shopper_my_shop_id());

create policy "owner edits shop settings" on public.shops
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "members read their shop's members" on public.shop_members
  for select to authenticated using (shop_id = public.shopper_my_shop_id());

create policy "members read their shop's invites" on public.shop_invites
  for select to authenticated using (shop_id = public.shopper_my_shop_id());

-- Called right after sign-up (and harmlessly on any later login). If the
-- user already belongs to a shop, returns it. If their email was invited,
-- joins that shop as a member. Otherwise creates their own shop.
create function public.shopper_bootstrap(p_nama text, p_shop_name text, p_plan text)
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

  insert into public.shops (owner_id, name, plan)
  values (
    v_uid,
    left(coalesce(nullif(btrim(p_shop_name), ''), 'Jastip'), 80),
    case when p_plan = 'team' then 'team' else 'solo' end
  )
  returning id into v_shop;

  insert into public.shop_members (shop_id, user_id, role, nama, email)
  values (v_shop, v_uid, 'owner', left(coalesce(p_nama, ''), 80), v_email);

  return v_shop;
end;
$$;

-- Owner only, Team only, and at most two people in a shop counting
-- pending invitations.
create function public.shopper_invite_member(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_shop public.shops%rowtype;
  v_id uuid;
begin
  select s.* into v_shop from public.shops s where s.owner_id = v_uid;
  if v_shop.id is null then
    raise exception 'not_owner';
  end if;
  if v_shop.plan <> 'team' then
    raise exception 'not_team_plan';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;
  if exists (select 1 from public.shop_members m where m.email = v_email) then
    raise exception 'already_member';
  end if;
  if exists (select 1 from public.shop_invites i where i.email = v_email) then
    raise exception 'already_invited';
  end if;
  if (select count(*) from public.shop_members m where m.shop_id = v_shop.id)
     + (select count(*) from public.shop_invites i where i.shop_id = v_shop.id) >= 2 then
    raise exception 'seat_limit';
  end if;

  insert into public.shop_invites (shop_id, email, invited_by)
  values (v_shop.id, v_email, v_uid)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.shopper_cancel_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.shop_invites i
  using public.shops s
  where i.id = p_invite_id and s.id = i.shop_id and s.owner_id = auth.uid();
end;
$$;

-- Owner removes the invited member (never themselves).
create function public.shopper_remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.shop_members m
  using public.shops s
  where m.user_id = p_user_id
    and m.role = 'member'
    and s.id = m.shop_id
    and s.owner_id = auth.uid();
end;
$$;

-- Any member may change the plan (members can manage billing). Going back
-- to Solo is refused while a second person or a pending invite exists.
create function public.shopper_set_plan(p_plan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_shop_id();
begin
  if v_shop is null then
    raise exception 'no_shop';
  end if;
  if p_plan not in ('solo', 'team') then
    raise exception 'invalid_plan';
  end if;
  if p_plan = 'solo' and (
    (select count(*) from public.shop_members m where m.shop_id = v_shop) > 1
    or exists (select 1 from public.shop_invites i where i.shop_id = v_shop)
  ) then
    raise exception 'has_members';
  end if;
  update public.shops set plan = p_plan where id = v_shop;
end;
$$;

-- A member's own display name.
create function public.shopper_update_my_name(p_nama text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.shop_members
  set nama = left(coalesce(btrim(p_nama), ''), 80)
  where user_id = auth.uid();
end;
$$;

revoke execute on function
  public.shopper_my_shop_id(),
  public.shopper_bootstrap(text, text, text),
  public.shopper_invite_member(text),
  public.shopper_cancel_invite(uuid),
  public.shopper_remove_member(uuid),
  public.shopper_set_plan(text),
  public.shopper_update_my_name(text)
from public, anon;

grant execute on function
  public.shopper_my_shop_id(),
  public.shopper_bootstrap(text, text, text),
  public.shopper_invite_member(text),
  public.shopper_cancel_invite(uuid),
  public.shopper_remove_member(uuid),
  public.shopper_set_plan(text),
  public.shopper_update_my_name(text)
to authenticated;
