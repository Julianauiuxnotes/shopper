-- The shop's country, chosen by its owner at sign-up. It decides the
-- currency tokens are sold in: IDR for Indonesia, USD everywhere else.
--
-- Two-letter code (ISO 3166-1). Null for shops created before this
-- migration; the app treats those as Indonesia. Clients can't change it:
-- it isn't in the columns 0002 lets the owner update, so a change goes
-- through the Justipers team (SQL Editor).

alter table public.shops
  add column country text check (country ~ '^[A-Z]{2}$');

-- Replaces the 0010 version: a new shop takes the country the owner
-- picked at sign-up, kept in the account's metadata (app/sign-up.tsx).
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
  v_country text := upper(coalesce(auth.jwt() -> 'user_metadata' ->> 'country', ''));
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

  insert into public.shops (owner_id, name, country)
  values (
    v_uid,
    left(coalesce(nullif(btrim(p_shop_name), ''), 'Jastip'), 80),
    case when v_country ~ '^[A-Z]{2}$' then v_country end
  )
  returning id into v_shop;

  insert into public.shop_members (shop_id, user_id, role, nama, email)
  values (v_shop, v_uid, 'owner', left(coalesce(p_nama, ''), 80), v_email);

  perform public.shopper_apply_tokens(v_shop, 5, 'bonus', null, null, 'Token gratis untuk mulai');
  return v_shop;
end;
$$;
