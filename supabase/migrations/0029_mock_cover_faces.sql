-- Mock users' cover photos (the Discover/Connections card background) become
-- portraits of AI-generated adults -- people who don't exist -- instead of 0026's
-- random scenery. Same gender as the mock user, hand-checked to be unmistakably
-- adult, and never a face that's anyone's profile picture (0028). Hosted with the
-- web build (public/mock-covers/). Internal testing only, like the mock users.
-- Pools: m-001..m-023, f-001..f-015 -- each cover is shared by a few mock users.

with mock as (
  select p.id,
    case when split_part(p.display_name, ' ', 1) in (
      'Ahmet', 'Mehmet', 'Emre', 'Burak', 'Can', 'Deniz', 'Mert', 'Kerem', 'Murat', 'Serkan', 'Ozan',
      'Aslan', 'Aziz', 'Timur', 'Nurlan', 'Rustam', 'Farid', 'Arman', 'Bekzod', 'Eldar', 'Yusuf', 'Tolga'
    ) then 'm' else 'f' end as pool
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email like '%@turanci-mock.invalid'
),
ranked as (
  select id, pool, row_number() over (partition by pool order by id) - 1 as rnk
  from mock
)
update public.profile_photos ph
set storage_path = 'https://turanci.expo.app/mock-covers/' || r.pool || '-'
  || lpad(((r.rnk % (case r.pool when 'm' then 23 else 15 end)) + 1)::text, 3, '0')
  || '.jpg'
from ranked r
where ph.user_id = r.id
  and ph.position = 0;
