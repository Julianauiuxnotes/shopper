-- Lets a login take the account over from another browser or device.
--
-- 0004 refuses a login while the account is active elsewhere. The login
-- screen now asks the user whether to log the other browser out instead;
-- if they agree, this hands the account to the new device. The old one
-- finds out on its next 30-second check and logs itself out.
--
-- Prototype: agreeing takes over immediately. The planned version sends a
-- confirmation email first and only switches once it is confirmed; that
-- needs an email service, which needs a domain.

create function public.shopper_take_over_session(p_device_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.user_sessions (user_id, device_id, last_seen)
  values (v_uid, p_device_id, now())
  on conflict (user_id) do update
    set device_id = excluded.device_id, last_seen = now();
end;
$$;

revoke execute on function public.shopper_take_over_session(text) from public, anon;
grant execute on function public.shopper_take_over_session(text) to authenticated;
