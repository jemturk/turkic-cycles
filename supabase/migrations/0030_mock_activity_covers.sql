-- Mock users' cover photos become wide activity shots -- people hiking, climbing,
-- surfing, walking the city, playing music and so on -- instead of 0029's close-up
-- portraits. Public-domain photos (CC0 / PDM) from Openverse, hand-checked: adults
-- only, no close-up faces. Hosted with the web build (public/mock-activities/,
-- credits in credits.json there). Internal testing only, like the mock users.
--
-- Pools: m-001..m-013 (men), f-001..f-009 (women), n-001..n-026 (subject not
-- clearly either, fine for anyone). Men draw from m + n, women from f + n.

with mock as (
  select p.id,
    split_part(p.display_name, ' ', 1) in (
      'Ahmet', 'Mehmet', 'Emre', 'Burak', 'Can', 'Deniz', 'Mert', 'Kerem', 'Murat', 'Serkan', 'Ozan',
      'Aslan', 'Aziz', 'Timur', 'Nurlan', 'Rustam', 'Farid', 'Arman', 'Bekzod', 'Eldar', 'Yusuf', 'Tolga'
    ) as is_male
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email like '%@turanci-mock.invalid'
),
ranked as (
  select id, is_male, (row_number() over (partition by is_male order by id) - 1) as rnk
  from mock
),
picked as (
  select id,
    case
      when is_male and rnk % 39 < 13 then 'm-' || lpad((rnk % 39 + 1)::text, 3, '0')
      when is_male then 'n-' || lpad((rnk % 39 - 13 + 1)::text, 3, '0')
      when rnk % 35 < 9 then 'f-' || lpad((rnk % 35 + 1)::text, 3, '0')
      else 'n-' || lpad((rnk % 35 - 9 + 1)::text, 3, '0')
    end as file
  from ranked
)
update public.profile_photos ph
set storage_path = 'https://turanci.expo.app/mock-activities/' || pk.file || '.jpg'
from picked pk
where ph.user_id = pk.id
  and ph.position = 0;
