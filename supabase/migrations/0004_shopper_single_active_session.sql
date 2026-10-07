-- One active browser/device per account.
--
-- An account may be in use on only one browser or device at a time. Each
-- installation has a random device id; the app "claims" the account for
-- its device at login and again every 30 seconds while it is open.
--
-- A claim is refused while another device holds the account. A device
-- holds it until it logs out, or until it has been silent for 3 minutes:
-- without that timeout, closing a tab without logging out (or losing the
-- phone) would lock the account for good.
--
-- This is per login account, so on a Team shop the owner and the invited
-- member can each be active on their own device at the same time.

create table public.user_sessions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 80),
  last_seen timestamptz not null default now()
);

-- Reached only through the two functions below.
alter table public.user_sessions enable row level security;
revoke all on table public.user_sessions from anon, authenticated;

-- True when this device now holds the account, false when another device
-- is actively using it.
create function public.shopper_claim_session(p_device_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.user_sessions%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.user_sessions (user_id, device_id)
  values (v_uid, p_device_id)
  on conflict (user_id) do nothing;

  select s.* into v_row from public.user_sessions s where s.user_id = v_uid for update;

  if v_row.device_id = p_device_id or v_row.last_seen < now() - interval '3 minutes' then
    update public.user_sessions
    set device_id = p_device_id, last_seen = now()
    where user_id = v_uid;
    return true;
  end if;

  return false;
end;
$$;

-- Called at logout so another device can log in straight away.
create function public.shopper_release_session(p_device_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.user_sessions
  where user_id = auth.uid() and device_id = p_device_id;
end;
$$;

revoke execute on function
  public.shopper_claim_session(text),
  public.shopper_release_session(text)
from public, anon;

grant execute on function
  public.shopper_claim_session(text),
  public.shopper_release_session(text)
to authenticated;
