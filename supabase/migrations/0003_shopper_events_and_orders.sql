-- Events and orders on the server (step 2 of the accounts/plans/sync plan).
--
-- The app stays local-first: each device keeps its own copy and works
-- offline, and a sync pass (lib/sync.ts) pushes what changed locally and
-- pulls what changed elsewhere. To keep that simple, the server stores
-- each event and each order as one JSON document rather than as columns:
-- the app already has these shapes, and nothing on the server needs to
-- look inside them yet.
--
-- Conflict rule: per document, the last write to arrive wins. Orders are
-- separate documents from their event so two people adding or editing
-- different orders in the same event never overwrite each other.
--
-- Photos are not here: they stay on the device for now.

create table public.shop_events (
  shop_id uuid not null references public.shops (id) on delete cascade,
  id text not null check (char_length(id) between 1 and 80),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 20000),
  -- Set by the server on every write; devices ask for "everything changed
  -- since the last value I saw", so device clocks never matter.
  server_updated_at timestamptz not null default now(),
  primary key (shop_id, id)
);

create table public.shop_orders (
  shop_id uuid not null references public.shops (id) on delete cascade,
  event_id text not null check (char_length(event_id) between 1 and 80),
  id text not null check (char_length(id) between 1 and 80),
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 200000),
  server_updated_at timestamptz not null default now(),
  primary key (shop_id, event_id, id)
);

create index shop_events_changed_idx on public.shop_events (shop_id, server_updated_at);
create index shop_orders_changed_idx on public.shop_orders (shop_id, server_updated_at);

create function public.shopper_touch_server_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.server_updated_at := now();
  return new;
end;
$$;

create trigger shop_events_touch before insert or update on public.shop_events
  for each row execute function public.shopper_touch_server_updated_at();
create trigger shop_orders_touch before insert or update on public.shop_orders
  for each row execute function public.shopper_touch_server_updated_at();

alter table public.shop_events enable row level security;
alter table public.shop_orders enable row level security;

revoke all on table public.shop_events, public.shop_orders from anon, authenticated;
grant select, insert, update on table public.shop_events, public.shop_orders to authenticated;

-- Every member of a shop can read and write that shop's events and
-- orders, and nobody else's.
create policy "members read their shop's events" on public.shop_events
  for select to authenticated using (shop_id = public.shopper_my_shop_id());
create policy "members add their shop's events" on public.shop_events
  for insert to authenticated with check (shop_id = public.shopper_my_shop_id());
create policy "members change their shop's events" on public.shop_events
  for update to authenticated
  using (shop_id = public.shopper_my_shop_id())
  with check (shop_id = public.shopper_my_shop_id());

create policy "members read their shop's orders" on public.shop_orders
  for select to authenticated using (shop_id = public.shopper_my_shop_id());
create policy "members add their shop's orders" on public.shop_orders
  for insert to authenticated with check (shop_id = public.shopper_my_shop_id());
create policy "members change their shop's orders" on public.shop_orders
  for update to authenticated
  using (shop_id = public.shopper_my_shop_id())
  with check (shop_id = public.shopper_my_shop_id());
