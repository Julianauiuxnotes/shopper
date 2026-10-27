-- Justipers beta: no new member invites until the full release.
--
-- The app already disables "Tambah anggota" during the beta; this makes the
-- server refuse too, so a request sent straight to shopper_buy_member_slot
-- can't add a member. "Beta" means what it means in the app: every price
-- in shopper_token_prices is 0 (see 0008). Ending the beta by setting the
-- prices back lifts this on its own.
--
-- Existing invites and members are untouched.

create function public.shopper_block_invites_in_beta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.shopper_token_prices p where p.tokens > 0) then
    raise exception 'beta_no_invites';
  end if;
  return new;
end;
$$;

revoke execute on function public.shopper_block_invites_in_beta() from public, anon, authenticated;

create trigger shop_invites_block_in_beta before insert on public.shop_invites
  for each row execute function public.shopper_block_invites_in_beta();
