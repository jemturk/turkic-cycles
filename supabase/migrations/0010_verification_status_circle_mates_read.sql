-- A verified badge only has value if OTHER users can see it (that's the point of a
-- trust signal) -- verification_status was self-only, which would have made
-- VerifiedBadge never render on anyone else's profile. Widen read access to
-- circle-mates, same pattern as profiles/user_connection_types. The API layer only
-- ever selects the `status` column for another user (never
-- stripe_identity_session_id), even though this row-level policy technically permits
-- the whole row.
create policy "circle-mates' verification status is readable"
  on public.verification_status for select
  using (
    exists (
      select 1 from public.circle_members cm1
      join public.circle_members cm2 on cm1.circle_id = cm2.circle_id
      where cm1.user_id = auth.uid() and cm2.user_id = verification_status.user_id
    )
  );
