-- Identity verification is real now (Stripe Identity): the create-verification-session
-- function records the member's session as 'pending', and stripe-identity-webhook sets
-- the result. The app itself no longer writes verification_status at all -- 0008 let
-- a member move their own row to 'pending' for the placeholder flow, which would now
-- let anyone appear to be "in review" without ever starting a check.
--
-- Reading is unchanged: your own row, and circle-mates' status for the badge (0010).
-- Test accounts can still flip their own badge with debug_set_my_verified (0042),
-- which runs as security definer and isn't affected.

drop policy "self can submit for pending verification" on public.verification_status;
drop policy "self can resubmit for pending verification" on public.verification_status;
