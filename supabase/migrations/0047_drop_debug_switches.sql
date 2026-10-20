-- The Settings test card is gone (its tier and Verified switches), so the functions
-- behind it go too: a test account could set its own Plus / Premium tier and its own
-- Verified badge with them (0036, limited to test accounts in 0042). A test
-- account's tier or badge is now changed with SQL (subscriptions,
-- verification_status), like anyone else's.
--
-- is_test_account() stays: 0042's visibility rules use it.

drop function if exists public.debug_set_my_tier(text);
drop function if exists public.debug_set_my_verified(boolean);
