-- Chat: reply to a message, and react to the other person's messages with an emoji.
--
--   1. messages.reply_to_id -- the message being replied to, which has to be in the
--      same conversation (enforced in the insert policy, recreated below).
--   2. message_reactions -- one emoji per person per message (choosing another
--      replaces it), only on the other participant's messages, readable by both.

-- 1 -------------------------------------------------------------------------------

alter table public.messages
  add column reply_to_id uuid references public.messages (id) on delete set null;

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
    and (
      reply_to_id is null
      or exists (
        select 1 from public.messages original
        where original.id = messages.reply_to_id and original.match_id = messages.match_id
      )
    )
  );

-- 2 -------------------------------------------------------------------------------

create table public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.message_reactions enable row level security;

-- Both participants of the message's conversation, unless either has blocked the other.
create policy "match participants can read reactions"
  on public.message_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.messages msg
      join public.matches m on m.id = msg.match_id
      where msg.id = message_reactions.message_id
        and (auth.uid() = m.user_a or auth.uid() = m.user_b)
        and not public.is_blocked(m.user_a, m.user_b)
    )
  );

-- Your own reaction, on a message the other participant sent.
create policy "react to the other participant's messages"
  on public.message_reactions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.messages msg
      join public.matches m on m.id = msg.match_id
      where msg.id = message_reactions.message_id
        and msg.sender_id <> auth.uid()
        and (auth.uid() = m.user_a or auth.uid() = m.user_b)
        and not public.is_blocked(m.user_a, m.user_b)
    )
  );

create policy "change your own reaction"
  on public.message_reactions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "remove your own reaction"
  on public.message_reactions for delete
  to authenticated
  using (auth.uid() = user_id);

-- The other device sees reactions come and go live. Full replica identity, so a
-- removal's event carries the row's message_id (not just the key) to the client.
alter table public.message_reactions replica identity full;
alter publication supabase_realtime add table public.message_reactions;
