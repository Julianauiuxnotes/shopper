-- Shop logo, shared across a shop's devices.
--
-- The logo used to live only on the device it was uploaded from. It is now
-- also kept here, one row per shop, so every device and member of the shop
-- shows the same logo. The app still keeps its own copy on the device and
-- only downloads this one when `server_updated_at` has changed.
--
-- The image is stored as a data: URI (the app compresses a logo to about
-- 200 KB before saving it; the check below is the hard ceiling). It gets
-- its own table rather than a column on `shops` so the shop row, which is
-- read often, stays small.

create table public.shop_logos (
  shop_id uuid primary key references public.shops (id) on delete cascade,
  data text not null check (data like 'data:image/%' and octet_length(data) <= 800000),
  server_updated_at timestamptz not null default now()
);

create trigger shop_logos_touch before insert or update on public.shop_logos
  for each row execute function public.shopper_touch_server_updated_at();

alter table public.shop_logos enable row level security;

revoke all on table public.shop_logos from anon, authenticated;
grant select, insert, update, delete on table public.shop_logos to authenticated;

-- Every member of the shop sees its logo; only the owner sets or removes it.
create policy "members read their shop's logo" on public.shop_logos
  for select to authenticated using (shop_id = public.shopper_my_shop_id());
create policy "owner adds the shop's logo" on public.shop_logos
  for insert to authenticated
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "owner changes the shop's logo" on public.shop_logos
  for update to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
create policy "owner removes the shop's logo" on public.shop_logos
  for delete to authenticated
  using (exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid()));
