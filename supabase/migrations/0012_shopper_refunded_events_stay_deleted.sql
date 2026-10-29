-- A refunded event can't come back.
--
-- 0007 only checked, on insert, that an event's "open" charge exists. A
-- refund (0008) keeps that charge and marks it refunded, so writing the
-- event row again as not deleted (an update, or an upsert of the same id)
-- brought a refunded event back for free.
--
-- Now an event whose charge was refunded always stays a deletion marker,
-- on insert and on update. It's kept quietly instead of raising: a device
-- that edited the event offline before the refund pushes it in the same
-- batch as its other changes, and an error would make that whole sync
-- fail on every retry. That device pulls the marker back and drops the
-- event like any other deletion.
--
-- An event that was never paid for is still refused (event_not_paid).

create or replace function public.shopper_require_paid_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refunded timestamptz;
begin
  if coalesce((new.data ->> 'deleted')::boolean, false) then
    return new;
  end if;
  select c.refunded_at into v_refunded from public.shop_event_charges c
  where c.shop_id = new.shop_id and c.event_id = new.id and c.kind = 'open';
  if not found then
    raise exception 'event_not_paid';
  end if;
  if v_refunded is not null then
    new.data := '{"deleted": true}'::jsonb;
  end if;
  return new;
end;
$$;

create trigger shop_events_stay_refunded before update on public.shop_events
  for each row execute function public.shopper_require_paid_event();
