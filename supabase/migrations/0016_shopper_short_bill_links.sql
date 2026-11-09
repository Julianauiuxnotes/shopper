-- Short bill links: app.justipers.com/r#k7Qm2xPa3B instead of a link that
-- carries the whole bill.
--
-- The full bill link (lib/receipt-link.ts, format 6) grows with every item
-- and bank account, and writes punctuation as "~2c", "~2e"… Chat apps
-- often stop linking it: too long, and WhatsApp reads "~…~" as
-- strikethrough. Now the app stores that same encoded bill here and sends
-- a 10-character id instead.
--
--   * Only a signed-in shop member can store a bill (shopper_create_bill).
--   * Anyone holding the id can read that one bill (shopper_get_bill), like
--     the old link: the id is 10 random base62 characters (~59 bits), so
--     bills can't be listed or guessed.
--   * Sharing the same bill twice returns the same id.
--
-- Nobody can read or write the table directly (RLS on, no policies).
-- Run after 0015.

create table public.shopper_bills (
  id text primary key check (id ~ '^[A-Za-z0-9]{10}$'),
  shop_id uuid not null references public.shops (id) on delete cascade,
  payload text not null check (char_length(payload) between 2 and 20000),
  payload_hash text not null,
  created_at timestamptz not null default now()
);

create unique index shopper_bills_shop_payload_idx on public.shopper_bills (shop_id, payload_hash);
create index shopper_bills_shop_created_idx on public.shopper_bills (shop_id, created_at);

alter table public.shopper_bills enable row level security;
revoke all on table public.shopper_bills from anon, authenticated;

-- Jastiper side: store an encoded bill, get its short id back.
create function public.shopper_create_bill(p_payload text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shop uuid := public.shopper_my_shop_id();
  v_hash text;
  v_id text;
  v_alphabet constant text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  v_bytes bytea;
  i int;
begin
  if v_shop is null then
    raise exception 'no_shop';
  end if;
  if p_payload is null or char_length(p_payload) not between 2 and 20000 then
    raise exception 'invalid_payload';
  end if;

  v_hash := encode(sha256(convert_to(p_payload, 'UTF8')), 'hex');
  select b.id into v_id from public.shopper_bills b
  where b.shop_id = v_shop and b.payload_hash = v_hash;
  if v_id is not null then
    return v_id;
  end if;

  -- A leaked session shouldn't be able to fill the database.
  if (
    select count(*) from public.shopper_bills b
    where b.shop_id = v_shop and b.created_at > now() - interval '1 hour'
  ) >= 300 then
    raise exception 'too_many_bills';
  end if;

  loop
    -- Random bytes from gen_random_uuid() (built in, no extension needed),
    -- skipping bytes 6 and 8, which hold the UUID's fixed version bits.
    v_bytes := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
    v_id := '';
    foreach i in array array[0, 1, 2, 3, 4, 5, 7, 9, 10, 11] loop
      v_id := v_id || substr(v_alphabet, (get_byte(v_bytes, i) % 62) + 1, 1);
    end loop;
    begin
      insert into public.shopper_bills (id, shop_id, payload, payload_hash)
      values (v_id, v_shop, p_payload, v_hash);
      return v_id;
    exception when unique_violation then
      -- Same bill stored meanwhile by another tap: return that one.
      select b.id into v_id from public.shopper_bills b
      where b.shop_id = v_shop and b.payload_hash = v_hash;
      if v_id is not null then
        return v_id;
      end if;
      -- Otherwise the random id collided; try another.
    end;
  end loop;
end;
$$;

-- Customer side: the public bill page reads one bill by its id.
create function public.shopper_get_bill(p_id text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select b.payload from public.shopper_bills b
  where p_id ~ '^[A-Za-z0-9]{10}$' and b.id = p_id;
$$;

revoke execute on function public.shopper_create_bill(text) from public, anon;
revoke execute on function public.shopper_get_bill(text) from public;
grant execute on function public.shopper_create_bill(text) to authenticated;
grant execute on function public.shopper_get_bill(text) to anon, authenticated;
