-- "See who likes you" is free for everyone until Plus can be bought: with no store
-- products yet, gating it behind Plus only hid likes from people who had no way to
-- pay. One switch, read by list_incoming_likes and by the app (which shows the
-- list instead of the teaser while it's on). When Plus goes on sale, redefine
-- likes_are_free() to return false; installed apps follow without an update.

create or replace function public.likes_are_free()
returns boolean
language sql
immutable
as $$
  select true;
$$;

revoke execute on function public.likes_are_free() from public, anon;
grant execute on function public.likes_are_free() to authenticated;

create or replace function public.list_incoming_likes()
returns table (user_id uuid, circle_id uuid, liked_at timestamptz)
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if auth.uid() is null or not (public.likes_are_free() or public.has_plus(auth.uid())) then
    raise exception 'Halka Plus is required to see who liked you.'
      using errcode = 'insufficient_privilege';
  end if;

  return query
    select l.user_id, l.circle_id, l.liked_at
    from public.pending_incoming_likes() l
    order by l.liked_at desc;
end;
$$;

revoke execute on function public.list_incoming_likes() from public, anon;
grant execute on function public.list_incoming_likes() to authenticated;
