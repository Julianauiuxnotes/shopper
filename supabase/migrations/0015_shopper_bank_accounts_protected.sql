-- Bank accounts can only be changed through the Edge Function
-- `shop-bank-accounts` (supabase/functions/shop-bank-accounts), which
-- asks for the owner's password again, records the owner's consent to the
-- privacy notice, and can email the owner about the change. A stolen
-- session alone can no longer swap the account customers pay into.
--
-- Run after 0014.

revoke update (bank_accounts) on table public.shops from authenticated;

alter table public.shops
  -- When the owner accepted the bank-account privacy notice (first time
  -- adding an account). Null = never.
  add column bank_accounts_consent_at timestamptz,
  add column bank_accounts_changed_at timestamptz;
