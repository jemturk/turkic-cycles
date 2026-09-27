-- Public bucket: avatars are shown to circle-mates, matches, and chat participants
-- (profiles.avatar_url is already selected in those contexts), so there's no benefit
-- to signed URLs here -- same tradeoff already made for the plain-text avatar_url
-- column itself.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Objects are keyed as "{user_id}/avatar", so foldername(name)[1] is the owning
-- user -- the same self-only pattern as every other table's RLS in this project,
-- just expressed against the object path instead of a user_id column.
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
