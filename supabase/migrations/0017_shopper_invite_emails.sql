-- Invitation emails: when an admin invites someone (shopper_buy_member_slot),
-- the app asks the shop-invite-email Edge Function to email them a link to
-- sign up. Until now an invited person was never told.
--
-- emailed_at records the last invitation email, so the same address can't
-- be emailed again and again (the function waits 10 minutes between sends).
-- Only the Edge Function (service role) writes it.
-- Run after 0016.

alter table public.shop_invites add column emailed_at timestamptz;
