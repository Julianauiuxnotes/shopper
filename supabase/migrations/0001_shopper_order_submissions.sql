-- Customer order-form submissions for Shopper.
--
-- A customer fills the public order form (app/o.tsx) and the order is
-- stored here until the jastiper's app collects it. There are no user
-- accounts yet, so access works by capability instead of login:
--
--   * Each jastiper install makes a random SECRET that never leaves the
--     device except in calls to the two "read" functions below.
--   * Its INBOX ID is the first 20 hex chars of sha256(secret). That id
--     is public: it travels in the order-form link so customers can
--     submit to it, but it can't be turned back into the secret.
--
-- Nobody can read or write the table directly (RLS on, no policies);
-- everything goes through the functions, which run as the owner.
-- Everything is prefixed `shopper_` so it can share a project with
-- another app's tables.

create table public.shopper_order_submissions (
  id uuid primary key default gen_random_uuid(),
  inbox_id text not null check (inbox_id ~ '^[0-9a-f]{20}$'),
  kode_event text not null check (char_length(kode_event) between 1 and 40),
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 8000
  ),
  created_at timestamptz not null default now()
);

create index shopper_order_submissions_inbox_idx
  on public.shopper_order_submissions (inbox_id, created_at);

alter table public.shopper_order_submissions enable row level security;
revoke all on table public.shopper_order_submissions from anon, authenticated;

-- Customer side: anyone holding an order-form link can add an order to
-- that link's inbox. The table's CHECKs bound what a row can hold, and an
-- inbox stops accepting at 500 uncollected orders so a leaked link can't
-- fill the database.
create function public.shopper_submit_order(
  p_inbox_id text,
  p_kode_event text,
  p_payload jsonb
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if (
    select count(*) from public.shopper_order_submissions s where s.inbox_id = p_inbox_id
  ) >= 500 then
    raise exception 'inbox_full';
  end if;

  insert into public.shopper_order_submissions (inbox_id, kode_event, payload)
  values (p_inbox_id, p_kode_event, p_payload)
  returning id into v_id;

  return v_id;
end;
$$;

-- Jastiper side: list the orders waiting in the inbox this secret opens.
create function public.shopper_fetch_orders(p_secret text)
returns table (id uuid, kode_event text, payload jsonb, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, s.kode_event, s.payload, s.created_at
  from public.shopper_order_submissions s
  where char_length(p_secret) >= 32
    and s.inbox_id = left(encode(sha256(convert_to(p_secret, 'UTF8')), 'hex'), 20)
  order by s.created_at
  limit 200;
$$;

-- Jastiper side: remove orders once the app has saved them on the device.
-- A separate step from fetching so an order isn't lost if the app closes
-- between receiving it and saving it.
create function public.shopper_ack_orders(p_secret text, p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.shopper_order_submissions s
  where char_length(p_secret) >= 32
    and s.inbox_id = left(encode(sha256(convert_to(p_secret, 'UTF8')), 'hex'), 20)
    and s.id = any (p_ids);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke execute on function public.shopper_submit_order(text, text, jsonb) from public;
revoke execute on function public.shopper_fetch_orders(text) from public;
revoke execute on function public.shopper_ack_orders(text, uuid[]) from public;
grant execute on function public.shopper_submit_order(text, text, jsonb) to anon, authenticated;
grant execute on function public.shopper_fetch_orders(text) to anon, authenticated;
grant execute on function public.shopper_ack_orders(text, uuid[]) to anon, authenticated;
