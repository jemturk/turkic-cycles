-- Matching model v1, stage 2: the tunable config, and interests as the model's tags.
--
-- 1. matching_config: every weight, multiplier, threshold and parameter of the
--    matching model (Matching Model v1 spec, "Reference implementation"), versioned, so
--    they can be tuned without an app release. One row is active; scoring (stage 4)
--    reads it and records the version with each suggestion. Server-only: no member
--    reads it. The tag lists themselves live in the app (src/constants/matching.ts),
--    stored by ID; only goal_pairs is needed here.
--
-- 2. profiles.interests now holds the model's interest tag IDs (3 to 10, enforced in
--    the app). Hobbies are folded in, since the tag list covers sports and arts. The old
--    English labels are mapped to the nearest tag; the ones with no equivalent (Night
--    life, Horoscope, Ski, Play an instrument) are dropped. A trigger keeps doing this for
--    app versions still on the Play store, which send the old labels.

create table public.matching_config (
  version text primary key,
  config jsonb not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index matching_config_one_active on public.matching_config (active) where active;

alter table public.matching_config enable row level security;
revoke all on public.matching_config from anon, authenticated;

insert into public.matching_config (version, active, config) values ('1.0.0', true, $json$
{
  "model_version": "1.0.0",
  "weights": {
    "friend":   {"interests": 25, "circles": 10, "values": 15, "heritage": 10, "life_stage": 10, "proximity": 15, "format_availability": 10, "goals": 5,  "professional": 0},
    "romantic": {"interests": 15, "circles": 5,  "values": 25, "heritage": 15, "life_stage": 15, "proximity": 15, "format_availability": 5,  "goals": 5,  "professional": 0},
    "mentor":   {"interests": 5,  "circles": 5,  "values": 5,  "heritage": 5,  "life_stage": 0,  "proximity": 0,  "format_availability": 20, "goals": 20, "professional": 40},
    "business": {"interests": 5,  "circles": 5,  "values": 10, "heritage": 5,  "life_stage": 0,  "proximity": 0,  "format_availability": 20, "goals": 25, "professional": 30}
  },
  "boosts": {"very": 1.5, "less": 0.5, "max_very": 3, "max_less": 2, "max_share": 0.40},
  "thresholds": {"min_match": 0.55, "strong_match": 0.75, "min_coverage": 0.70, "worth_a_look": 0.45},
  "ranking": {"daily_limit": 10, "pass_cooldown_days": 30, "worth_a_look_max": 3, "tie_within": 0.01},
  "params": {
    "interests_full": 3,
    "circles_full": 2,
    "goals_full": 2,
    "age_span_friend": 15,
    "age_span_romantic": 10,
    "default_distance_mi": {"friend": 30, "romantic": 100, "nearby": 30},
    "heritage": {"shared": 1.0, "both_unshared": 0.6, "otherwise": 0.3},
    "mentor_min_gap_years": 3,
    "experience_gap": {"full": [5, 15], "half": [[3, 4], [16, 25]]},
    "professional": {"mentor": {"coverage": 0.6, "experience": 0.4}, "business": {"coverage": 0.7, "industry": 0.3}},
    "format_availability": {"format": 0.5, "availability": 0.5}
  },
  "values_questions": {"friend": [1, 2, 3, 4, 5], "romantic": [1, 2, 3, 4, 5], "mentor": [3, 4], "business": [3, 4]},
  "goal_pairs": [["find_investors", "invest_in_ventures"], ["find_clients", "offer_services"]]
}
$json$::jsonb);

-- Old label -> tag ID; null for labels with no equivalent. Anything already shaped like
-- a tag ID passes through.
create or replace function public.interest_tag(label text)
returns text
language sql
immutable
as $$
  select case label
    when 'Family' then 'family_outings'
    when 'Kids' then 'kids_activities'
    when 'Travel' then 'travel'
    when 'Exercise' then 'gym_fitness'
    when 'Self-development' then 'personal_growth'
    when 'Swim' then 'beach_water'
    when 'Tennis' then 'tennis_pickleball'
    when 'Soccer' then 'soccer'
    when 'Paint' then 'painting_crafts'
    when 'Sing' then 'live_music'
    when 'Music' then 'live_music'
    else case when label ~ '^[a-z][a-z_]*$' then label end
  end;
$$;

revoke execute on function public.interest_tag(text) from public, anon, authenticated;

-- Definer, so it can call interest_tag, which members can't.
create or replace function public.normalize_interests()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.interests := coalesce(
    (select array_agg(tag order by first_seen)
     from (
       select public.interest_tag(label) as tag, min(position) as first_seen
       from unnest(coalesce(new.interests, '{}') || coalesce(new.hobbies, '{}')) with ordinality as t(label, position)
       group by 1
     ) mapped
     where tag is not null),
    '{}'
  );
  new.hobbies := '{}';
  return new;
end;
$$;

revoke execute on function public.normalize_interests() from public, anon, authenticated;

create trigger profiles_normalize_interests
  before insert or update of interests, hobbies on public.profiles
  for each row execute function public.normalize_interests();

-- Everyone's current interests and hobbies, through the same mapping.
update public.profiles set interests = interests
where cardinality(interests) > 0 or cardinality(hobbies) > 0;
