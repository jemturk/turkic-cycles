-- Message updates are for receipts only, by the person a message was sent to.
--
-- 0007's update policy let either participant update any message in their match and
-- wasn't column-restricted: the sender could fake "read" on their own messages, and
-- either side could even rewrite the other's text. The app only ever sets
-- delivered_at (src/hooks/useMarkDelivered.ts) and read_at (markThreadRead) on
-- messages sent to the user, so that is now all an update may do:
--
--   * the policy: only messages someone else sent you, in a match you're in, while
--     neither of you has blocked the other (as reading and sending require);
--   * a trigger: only delivered_at and read_at may change, and only from empty to a
--     time -- never edited or cleared. Everything else (body, sender, match, reply,
--     created_at) is fixed once sent.
--
-- The service role and migrations aren't signed-in users (auth.role() isn't
-- 'authenticated'), so server-side fixes stay possible.

drop policy "match participants can mark messages read" on public.messages;

create policy "recipients can mark messages delivered or read"
  on public.messages for update to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and (auth.uid() = m.user_a or auth.uid() = m.user_b)
        and not public.is_blocked(m.user_a, m.user_b)
    )
  )
  with check (sender_id <> auth.uid());

create or replace function public.message_update_is_receipt_only()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;
  if new.body is distinct from old.body
     or new.sender_id is distinct from old.sender_id
     or new.match_id is distinct from old.match_id
     or new.reply_to_id is distinct from old.reply_to_id
     or new.created_at is distinct from old.created_at
     or new.id is distinct from old.id then
    raise exception 'A sent message can''t be changed; only its delivered and read times are set.'
      using errcode = '42501';
  end if;
  if (old.delivered_at is not null and new.delivered_at is distinct from old.delivered_at)
     or (old.read_at is not null and new.read_at is distinct from old.read_at) then
    raise exception 'A message''s delivered and read times are set once.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke execute on function public.message_update_is_receipt_only() from public, anon, authenticated;

create trigger messages_update_is_receipt_only
  before update on public.messages
  for each row execute function public.message_update_is_receipt_only();
