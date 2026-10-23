-- 0038's insert policy on messages checked that a reply's original is in the same
-- conversation with a subquery on messages itself, which Postgres rejects as
-- "infinite recursion detected in policy for relation messages" -- on every insert,
-- reply or not, so no message could be sent at all. The check moves to a BEFORE
-- INSERT trigger (security definer, so it reads the original without going through
-- RLS), and the policy goes back to 0007's rule, now for authenticated only.

drop policy "match participants can send messages" on public.messages;

create policy "match participants can send messages"
  on public.messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.user_a or auth.uid() = m.user_b)
        and not public.is_blocked(m.user_a, m.user_b)
    )
  );

create or replace function public.check_reply_in_same_match()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.reply_to_id is not null and not exists (
    select 1 from public.messages original
    where original.id = new.reply_to_id and original.match_id = new.match_id
  ) then
    raise exception 'A reply has to be to a message in the same conversation.'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.check_reply_in_same_match() from public, anon;

create trigger "check_reply_in_same_match"
  before insert on public.messages
  for each row execute function public.check_reply_in_same_match();
