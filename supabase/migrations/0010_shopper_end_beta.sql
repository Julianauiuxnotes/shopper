-- Justipers leaves the beta: actions cost tokens again, and every shop
-- starts with 5 free tokens (was 3) to try the app.
--
-- Prices go back to what 0007 planned: Buka event 1, publish 1, member
-- slot 5. With a price above 0 the 0009 invite block lifts on its own.

update public.shopper_token_prices set tokens = 1 where kind in ('open_event', 'publish_event');
update public.shopper_token_prices set tokens = 5 where kind = 'member_slot';

-- Replaces the 0007 version: a new shop starts with 5 free tokens.
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

  perform public.shopper_apply_tokens(v_shop, 5, 'bonus', null, null, 'Token gratis untuk mulai');
  return v_shop;
end;
$$;

-- Shops that already exist are topped up to the same 5 free tokens: each
-- gets whatever its free ("bonus") tokens so far fall short of 5.
select public.shopper_apply_tokens(b.shop_id, 5 - b.bonus, 'bonus', null, null, 'Token gratis untuk mulai')
from (
  select s.id as shop_id,
    coalesce((select sum(l.delta) from public.shop_token_ledger l
              where l.shop_id = s.id and l.kind = 'bonus'), 0)::integer as bonus
  from public.shops s
) b
where b.bonus < 5;
