-- The jastiper's address and bank accounts, set by the owner in
-- Pengaturan (app/settings.tsx) and printed on the customer's bill
-- (components/tagihan-receipt.tsx), so customers know where to transfer.
-- Both optional.
--
-- bank_accounts: up to 3 of {"bank": "BCA", "nomor": "1234567890",
-- "nama": "Juliana"}. The app checks each entry is complete; here only
-- the shape and size are enforced.

alter table public.shops
  add column alamat text not null default '' check (char_length(alamat) <= 300),
  add column bank_accounts jsonb not null default '[]'::jsonb check (
    jsonb_typeof(bank_accounts) = 'array'
    and jsonb_array_length(bank_accounts) <= 3
    and octet_length(bank_accounts::text) <= 1000
  );

-- The owner already updates name and telepon this way (0002's "owner
-- edits shop settings" policy decides who).
grant update (alamat, bank_accounts) on table public.shops to authenticated;
