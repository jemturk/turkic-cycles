-- A new match pushes "You and Ayc liked each other" to whoever liked first; the one
-- who liked second sees the match screen in the app. Same mechanism as message pushes
-- (0015) and report alerts (0049): after the insert, pg_net calls the send-match-push
-- Edge Function with only the match's id, and the function reads everything else from
-- the database, so a forged call can't push anything made up.
--
-- send-match-push is deployed with --no-verify-jwt: Postgres, not a signed-in user,
-- calls it, and no key goes into source control.

create or replace function public.notify_match_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://mpcfakrdgqzcofscnwvu.supabase.co/functions/v1/send-match-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('type', 'INSERT', 'table', 'matches', 'record', jsonb_build_object('id', new.id)),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

revoke execute on function public.notify_match_insert() from public, anon, authenticated;

create trigger on_match_insert_send_push
  after insert on public.matches
  for each row execute function public.notify_match_insert();
