-- Found by scripts/check_anon_access.py: two functions still executable with only
-- the public anon key (Postgres grants EXECUTE to PUBLIC by default, and Supabase
-- grants anon too).
--
--   * process_overdue_safety_checkins -- meant only for its pg_cron job (which runs
--     as postgres), but any caller could trigger it. Not called from the app.
--   * is_blocked -- let anyone ask whether two arbitrary user ids block each other.
--     Still needed by authenticated users: messages/swipes/matches RLS policies
--     evaluate it as the calling role.

revoke execute on function public.process_overdue_safety_checkins() from public, anon, authenticated;
revoke execute on function public.is_blocked(uuid, uuid) from public, anon;

-- And stop the next function from starting out anon-callable: functions created by
-- migrations (role postgres) in public no longer get EXECUTE for PUBLIC/anon
-- automatically. A function that really should be public needs an explicit grant.
alter default privileges for role postgres in schema public revoke execute on functions from public, anon;
