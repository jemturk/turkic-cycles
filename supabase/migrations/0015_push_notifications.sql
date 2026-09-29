-- Push notification infrastructure: a delivered_at column on messages (alongside
-- the existing read_at) for the "delivered" chat receipt, a table of per-device
-- Expo push tokens, and a Database Webhook trigger that calls an Edge Function on
-- every new message to actually send the push. The Edge Function itself
-- (supabase/functions/send-message-push) still needs `supabase functions deploy`
-- and EAS push credentials configured -- see supabase/functions/send-message-push/README.md.

alter table public.messages add column delivered_at timestamptz;

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "own push tokens are readable"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "register own push token"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

-- `using (true)`, not self-only: the same physical device's token needs to be
-- reassignable when a different account signs in on it later (same real-world
-- behavior as WhatsApp/Messenger rebinding a device's token on login) -- the
-- `using` clause runs against the EXISTING row (which may belong to whoever was
-- previously signed in there), so it can't require auth.uid() = user_id the way a
-- normal self-only policy would. `with check` is what actually guards this,
-- requiring the row to belong to the caller once the update completes -- you can
-- only claim a token as your own, never hand it to another user_id.
create policy "reclaim a push token for the current user"
  on public.push_tokens for update
  using (true)
  with check (auth.uid() = user_id);

create policy "remove own push token"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

-- Database Webhook: fires after every message insert: Postgres, not an end user,
-- is the only caller, so the function is deployed with --no-verify-jwt (see its
-- README) rather than embedding a service-role/anon key in this trigger
-- definition, which would otherwise put a secret in source control.
create trigger "on_message_insert_send_push"
  after insert on public.messages
  for each row execute function supabase_functions.http_request(
    'https://mpcfakrdgqzcofscnwvu.supabase.co/functions/v1/send-message-push',
    'POST',
    '{"Content-Type":"application/json"}',
    '{}',
    '5000'
  );
