-- Row Level Security and privileges (security items 3, 4, 7, 8).
--
-- Model:
--   * Every table in public has RLS enabled. No policy = no access (default deny).
--   * anon / authenticated get only the table and column privileges listed here.
--     Server-managed columns (role, is_premium, is_verified, review status,
--     user_id) are never granted for writes, so mass assignment is blocked at
--     the database even if an API route forgets to filter input.
--   * service_role (server only, never shipped to the browser) bypasses RLS and
--     is used for admin jobs, quotas, audit logs and moderated writes.

-- Start from zero: drop the broad default grants Supabase gives to API roles.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

-- Future tables also start with no client privileges.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.nutrition_targets   enable row level security;
alter table public.foods               enable row level security;
alter table public.food_servings       enable row level security;
alter table public.favorite_foods      enable row level security;
alter table public.recipes             enable row level security;
alter table public.recipe_ingredients  enable row level security;
alter table public.meal_entries        enable row level security;
alter table public.water_logs          enable row level security;
alter table public.weight_logs         enable row level security;
alter table public.body_measurements   enable row level security;
alter table public.progress_photos     enable row level security;
alter table public.fasting_sessions    enable row level security;
alter table public.badges              enable row level security;
alter table public.user_badges         enable row level security;
alter table public.reviews             enable row level security;
alter table public.contact_messages    enable row level security;  -- server only, no policies
alter table public.ai_usage            enable row level security;  -- server only, no policies
alter table public.audit_logs          enable row level security;  -- server only, no policies

-- ---------------------------------------------------------------------------
-- profiles: read and edit your own row; server-managed columns are not writable
-- ---------------------------------------------------------------------------
grant select on public.profiles to authenticated;
grant update (
  display_name, date_of_birth, sex, height_cm, activity_level, goal, diet_type,
  allergies, unit_system, locale, hide_numbers, onboarding_completed_at,
  health_data_consent_at, age_confirmed_at
) on public.profiles to authenticated;

create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Generic "own rows" tables: full CRUD on rows where user_id = auth.uid()
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'nutrition_targets', 'favorite_foods', 'recipes', 'meal_entries', 'water_logs',
    'weight_logs', 'body_measurements', 'progress_photos', 'fasting_sessions'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t || '_delete_own', t);
  end loop;
end;
$$;

-- user_id can't be moved to another account after insert.
revoke update on public.nutrition_targets, public.favorite_foods, public.recipes,
  public.meal_entries, public.water_logs, public.weight_logs, public.body_measurements,
  public.progress_photos, public.fasting_sessions from authenticated;

grant update (effective_from, calories, protein_g, carbs_g, fat_g, fiber_g, water_ml, source)
  on public.nutrition_targets to authenticated;
grant update (name, servings, source_url) on public.recipes to authenticated;
grant update (logged_on, meal, food_id, recipe_id, label, grams, calories, protein_g, carbs_g, fat_g, nutrients)
  on public.meal_entries to authenticated;
grant update (logged_on, ml) on public.water_logs to authenticated;
grant update (measured_on, weight_kg_enc) on public.weight_logs to authenticated;
grant update (measured_on, data_enc) on public.body_measurements to authenticated;
grant update (taken_on) on public.progress_photos to authenticated;
grant update (ended_at, target_hours) on public.fasting_sessions to authenticated;
-- favorite_foods has nothing to update.

-- Photo rows are created by the upload route (service role) after it validates
-- and strips the file (security item 16); clients may only read and delete.
revoke insert on public.progress_photos from authenticated;

-- ---------------------------------------------------------------------------
-- foods: shared catalogue is public; custom foods are private to their owner
-- ---------------------------------------------------------------------------
grant select on public.foods to anon, authenticated;
grant insert (id, name, name_local, brand, barcode, calories, protein_g, carbs_g, fat_g,
              fiber_g, sugar_g, sodium_mg, micronutrients)
  on public.foods to authenticated;
grant update (name, name_local, brand, barcode, calories, protein_g, carbs_g, fat_g,
              fiber_g, sugar_g, sodium_mg, micronutrients)
  on public.foods to authenticated;
grant delete on public.foods to authenticated;

create policy foods_select_catalogue on public.foods
  for select to anon, authenticated using (owner_id is null);
create policy foods_select_own on public.foods
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy foods_insert_own on public.foods
  for insert to authenticated
  with check ((select auth.uid()) = owner_id and source = 'user' and is_verified = false);
create policy foods_update_own on public.foods
  for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy foods_delete_own on public.foods
  for delete to authenticated using ((select auth.uid()) = owner_id);

-- food_servings follow the visibility / ownership of their food.
grant select on public.food_servings to anon, authenticated;
grant insert (id, food_id, label, grams), update (label, grams), delete on public.food_servings to authenticated;

create policy food_servings_select on public.food_servings
  for select to anon, authenticated
  using (exists (
    select 1 from public.foods f
    where f.id = food_id and (f.owner_id is null or f.owner_id = (select auth.uid()))
  ));
create policy food_servings_write_own on public.food_servings
  for all to authenticated
  using (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.foods f where f.id = food_id and f.owner_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- recipe_ingredients: through recipe ownership, and only foods you can see
-- ---------------------------------------------------------------------------
grant select, insert (id, recipe_id, food_id, grams), update (food_id, grams), delete
  on public.recipe_ingredients to authenticated;

create policy recipe_ingredients_own on public.recipe_ingredients
  for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid())))
  with check (
    exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = (select auth.uid()))
    and exists (
      select 1 from public.foods f
      where f.id = food_id and (f.owner_id is null or f.owner_id = (select auth.uid()))
    )
  );

-- ---------------------------------------------------------------------------
-- badges / user_badges: catalogue is public; awards are written by the server
-- ---------------------------------------------------------------------------
grant select on public.badges to anon, authenticated;
create policy badges_select_all on public.badges for select to anon, authenticated using (true);

grant select on public.user_badges to authenticated;
create policy user_badges_select_own on public.user_badges
  for select to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- reviews: anyone reads published reviews; signed-in users manage their own.
-- status is set only by moderation (service role).
-- ---------------------------------------------------------------------------
grant select on public.reviews to anon, authenticated;
grant insert (id, rating, title, body), update (rating, title, body), delete
  on public.reviews to authenticated;

create policy reviews_select_published on public.reviews
  for select to anon, authenticated using (status = 'published');
create policy reviews_select_own on public.reviews
  for select to authenticated using ((select auth.uid()) = user_id);
create policy reviews_insert_own on public.reviews
  for insert to authenticated with check ((select auth.uid()) = user_id and status = 'pending');
create policy reviews_update_own on public.reviews
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy reviews_delete_own on public.reviews
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Editing a review sends it back to moderation.
create or replace function public.reviews_reset_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.rating, new.title, new.body) is distinct from (old.rating, old.title, old.body) then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create trigger reviews_reset_status before update on public.reviews
  for each row execute function public.reviews_reset_status();

revoke all on function public.reviews_reset_status() from anon, authenticated, public;
