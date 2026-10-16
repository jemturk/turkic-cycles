-- Reassigning a device's push token to whoever signs in on it next (0015's intent)
-- never actually worked: the client's upsert is INSERT ... ON CONFLICT DO UPDATE,
-- and Postgres checks the existing row against the SELECT policy as well as the
-- UPDATE one. SELECT is own-rows-only, so once a token belonged to one account,
-- signing in to another account on that phone failed with "new row violates
-- row-level security policy (USING expression)".
--
-- Registration now goes through this function instead. It only ever claims a token
-- for the caller (auth.uid()), never for another user_id -- the same guarantee 0015's
-- UPDATE policy's `with check` gave. That policy (`using (true)`) only exists for
-- the old upsert, but builds already installed still re-register their own token
-- with it on every launch -- drop it in a later migration once they've updated.

create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in.' using errcode = 'insufficient_privilege';
  end if;

  insert into public.push_tokens (user_id, token, platform)
  values (auth.uid(), p_token, p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform;
end;
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
