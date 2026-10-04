-- Step 3d: fasting, streaks and badges, and consent for AI features.

-- One open fast per person at a time.
create unique index fasting_sessions_one_open
  on public.fasting_sessions (user_id) where ended_at is null;

insert into public.badges (code, name, description) values
  ('first_log',     'First bite',       'Logged your first food.'),
  ('streak_3',      'Three in a row',   'Logged food three days in a row.'),
  ('streak_7',      'Full week',        'Logged food seven days in a row.'),
  ('streak_30',     'Thirty days',      'Logged food thirty days in a row.'),
  ('logs_100',      'Century',          'Logged one hundred foods.'),
  ('first_recipe',  'Home cook',        'Saved your first recipe.'),
  ('first_weigh_in','On the scale',     'Logged your weight on the Progress page.'),
  ('water_goal',    'Well watered',     'Reached your water target in a day.'),
  ('first_fast',    'Patience',         'Finished a fast that reached its target.')
on conflict (code) do update set name = excluded.name, description = excluded.description;

-- When the user agreed that AI features may send their photos and messages to
-- the AI provider (who may use them to improve its products). Null = not agreed.
alter table public.profiles add column ai_consent_at timestamptz;
grant update (ai_consent_at) on public.profiles to authenticated;
