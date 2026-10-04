-- RLS and privilege tests (security items 4, 7, 8, 31, 49, 50).
-- Run with scripts/test-db.sh. Any failed assertion aborts with an error.

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------------------
-- Test helpers
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated, service_role;

-- Fails unless running q raises the given SQLSTATE.
create function tests.throws(q text, expected text) returns void
language plpgsql as $$
declare
  succeeded boolean := false;
begin
  begin
    execute q;
    succeeded := true;
  exception when others then
    if sqlstate <> expected then
      raise exception 'FAIL: expected % but got % (%) for: %', expected, sqlstate, sqlerrm, q;
    end if;
  end;
  if succeeded then
    raise exception 'FAIL: expected % but query succeeded: %', expected, q;
  end if;
end;
$$;

create function tests.eq(actual bigint, expected bigint, label text) returns void
language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'FAIL: % (expected %, got %)', label, expected, actual;
  end if;
end;
$$;

create function tests.rows(q text) returns bigint
language plpgsql as $$
declare
  n bigint;
begin
  execute format('select count(*) from (%s) s', q) into n;
  return n;
end;
$$;

create function tests.affected(q text) returns bigint
language plpgsql as $$
declare
  n bigint;
begin
  execute q;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on all functions in schema tests to anon, authenticated, service_role;

-- Error codes
--   42501 insufficient_privilege / RLS violation
--   23514 check_violation
--   P0001 raise_exception

-- ---------------------------------------------------------------------------
-- Fixtures (as the migration owner)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.test');

insert into public.foods (id, owner_id, name, source, is_verified, calories, protein_g, carbs_g, fat_g)
values ('10000000-0000-0000-0000-000000000001', null, 'Idli (steamed)', 'indian_seed', true, 146, 4.5, 30, 0.4);

insert into public.badges (code, name, description) values ('first_log', 'First log', 'Logged your first meal');

-- Structure: RLS must be on for every table in public.
select tests.eq(
  (select count(*) from pg_tables where schemaname = 'public' and not rowsecurity),
  0, 'every public table has RLS enabled');

-- Signup trigger created profiles.
select tests.eq((select count(*) from public.profiles), 2, 'profiles auto-created on signup');

-- ---------------------------------------------------------------------------
-- User A writes their own data
-- ---------------------------------------------------------------------------
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', false);

insert into public.meal_entries (id, meal, label, calories) values
  ('20000000-0000-0000-0000-000000000001', 'breakfast', '2 idli', 116);
insert into public.foods (id, name, calories) values
  ('10000000-0000-0000-0000-0000000000a1', 'A''s homemade avial', 120);
insert into public.reviews (rating, body) values (5, 'Logging Kerala food is finally easy.');

select tests.eq(tests.rows('select * from public.meal_entries'), 1, 'A sees own meal entry');
select tests.eq(tests.rows('select * from public.profiles'), 1, 'A sees only own profile');
select tests.eq(tests.rows('select * from public.foods where external_id is null'), 2, 'A sees catalogue + own custom food');

-- Mass assignment (item 8): server-managed columns are not writable.
select tests.throws($$update public.profiles set role = 'admin'$$, '42501');
select tests.throws($$update public.profiles set is_premium = true$$, '42501');
select tests.throws($$insert into public.foods (name, calories, is_verified) values ('x', 1, true)$$, '42501');
select tests.throws($$insert into public.foods (name, calories, owner_id) values ('x', 1, null)$$, '42501');
select tests.throws($$update public.reviews set status = 'published'$$, '42501');
select tests.throws($$update public.meal_entries set user_id = '00000000-0000-0000-0000-00000000000b'$$, '42501');
select tests.throws($$insert into public.user_badges (user_id, badge_code) values (auth.uid(), 'first_log')$$, '42501');
select tests.throws($$insert into public.progress_photos (storage_path) values ('x/y.jpg')$$, '42501');

-- Allowed profile edits still work.
select tests.eq(tests.affected($$update public.profiles set display_name = 'A'$$), 1, 'A can edit own display name');

-- Health safety (items 49, 50).
select tests.throws(
  $$insert into public.nutrition_targets (calories, protein_g, carbs_g, fat_g) values (800, 50, 80, 20)$$,
  '23514');
select tests.throws(
  $$update public.profiles set date_of_birth = current_date - interval '15 years', goal = 'lose'$$,
  '23514');
select tests.eq(
  tests.affected($$update public.profiles set date_of_birth = current_date - interval '15 years', goal = 'maintain'$$),
  1, 'minor can set a maintain goal');

-- Server-only tables.
select tests.throws($$select * from public.audit_logs$$, '42501');
select tests.throws($$select * from public.ai_usage$$, '42501');
select tests.throws($$insert into public.contact_messages (name, email, message) values ('a','a@b.c','hi')$$, '42501');

-- ---------------------------------------------------------------------------
-- User B cannot see or touch A's data (items 4, 7)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', false);

select tests.eq(tests.rows('select * from public.meal_entries'), 0, 'B cannot read A''s meals');
select tests.eq(tests.rows('select * from public.foods where external_id is null'), 1, 'B sees catalogue only, not A''s custom food');
select tests.eq(tests.rows('select * from public.reviews'), 0, 'B cannot see A''s pending review');
select tests.eq(
  tests.affected($$update public.meal_entries set calories = 0 where id = '20000000-0000-0000-0000-000000000001'$$),
  0, 'B cannot update A''s meal by id (IDOR)');
select tests.eq(
  tests.affected($$delete from public.meal_entries where id = '20000000-0000-0000-0000-000000000001'$$),
  0, 'B cannot delete A''s meal by id (IDOR)');
select tests.eq(
  tests.affected($$update public.foods set calories = 0 where id = '10000000-0000-0000-0000-0000000000a1'$$),
  0, 'B cannot edit A''s custom food');
select tests.throws(
  $$insert into public.meal_entries (user_id, meal, label, calories)
    values ('00000000-0000-0000-0000-00000000000a', 'lunch', 'forged', 1)$$,
  '42501');

-- B can't build a recipe from A's private food.
insert into public.recipes (id, name) values ('30000000-0000-0000-0000-000000000001', 'B''s sambar');
select tests.throws(
  $$insert into public.recipe_ingredients (recipe_id, food_id, grams)
    values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-0000000000a1', 100)$$,
  '42501');
insert into public.recipe_ingredients (recipe_id, food_id, grams)
  values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 100);

-- ---------------------------------------------------------------------------
-- Anonymous visitors
-- ---------------------------------------------------------------------------
reset role;
select set_config('request.jwt.claims', '', false);
set role anon;

select tests.eq(tests.rows('select * from public.foods where external_id is null'), 1, 'anon sees catalogue foods');
select tests.eq(tests.rows('select * from public.badges'), 1, 'anon sees badge catalogue');
select tests.eq(tests.rows('select * from public.reviews'), 0, 'anon sees no unpublished reviews');
select tests.throws($$select * from public.meal_entries$$, '42501');
select tests.throws($$select * from public.profiles$$, '42501');
select tests.throws($$insert into public.reviews (rating, body) values (5, 'fake review text')$$, '42501');

-- ---------------------------------------------------------------------------
-- Moderation (service role) and review lifecycle
-- ---------------------------------------------------------------------------
reset role;
set role service_role;
update public.reviews set status = 'published';
reset role;

set role anon;
select tests.eq(tests.rows('select * from public.reviews'), 1, 'anon sees published review');
reset role;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', false);
update public.reviews set body = 'Edited: still the best tracker for Kerala food.';
reset role;
select tests.eq(
  (select count(*) from public.reviews where status = 'pending'), 1, 'edited review returns to moderation');

-- ---------------------------------------------------------------------------
-- Audit log is append-only even for the owner role (item 31)
-- ---------------------------------------------------------------------------
insert into public.audit_logs (user_id, action) values ('00000000-0000-0000-0000-00000000000a', 'login');
select tests.throws($$update public.audit_logs set action = 'tampered'$$, 'P0001');
select tests.throws($$delete from public.audit_logs$$, 'P0001');

-- Deleting an account removes all of its data.
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
select tests.eq((select count(*) from public.meal_entries), 0, 'account deletion cascades to meals');
select tests.eq((select count(*) from public.foods where owner_id is not null), 0, 'account deletion cascades to custom foods');
select tests.eq((select count(*) from public.audit_logs), 1, 'audit log survives account deletion');

-- ---------------------------------------------------------------------------
-- Rate limiting (item 11): server only, counts hits per window
-- ---------------------------------------------------------------------------
set role authenticated;
select tests.throws($$select public.check_rate_limit('login:x', 5, 60)$$, '42501');
select tests.throws($$select * from public.rate_limits$$, '42501');
reset role;

set role service_role;
select tests.eq((select count(*) from generate_series(1, 3) where public.check_rate_limit('login:test', 3, 3600)), 3,
  'first 3 hits are allowed');
select tests.eq(public.check_rate_limit('login:test', 3, 3600)::int, 0, '4th hit is blocked');
select tests.eq(public.check_rate_limit('login:other', 3, 3600)::int, 1, 'other keys are independent');
reset role;

-- ---------------------------------------------------------------------------
-- Food search (step 3a): catalogue + own foods only, wildcards escaped
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000c', 'c@example.test'),
  ('00000000-0000-0000-0000-00000000000d', 'd@example.test');

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', false);
insert into public.foods (name, calories) values ('C''s secret dosa batter', 150);
select tests.eq(tests.rows($$select * from public.search_foods('dosa')$$), 3, 'C finds catalogue dosas plus own food');
select tests.eq(tests.rows($$select * from public.search_foods('dosa') where owner_id is not null limit 1$$), 1,
  'own foods rank first');
select tests.eq(tests.rows($$select * from public.search_foods('_')$$), 0, 'a bare _ is a literal, not a wildcard');
select tests.eq(tests.rows($$select * from public.search_foods('(1%)')$$), 1, 'a % matches only a literal %');
select tests.eq(tests.rows($$select * from public.search_foods('')$$), 0, 'empty query returns nothing');
select tests.eq(tests.rows($$select * from public.search_foods('a', 500)$$), 50, 'results are capped at 50');
select tests.eq(tests.rows($$select * from public.search_foods('അപ്പം')$$), 1, 'local-language names are searchable');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated"}', false);
select tests.eq(tests.rows($$select * from public.search_foods('secret dosa')$$), 0, 'D cannot find C''s custom food');
select tests.eq(tests.affected($$update public.profiles set timezone = 'Asia/Kolkata'$$), 1, 'timezone is user-editable');
reset role;

set role anon;
select tests.throws($$select * from public.search_foods('dosa')$$, '42501');
reset role;

\echo 'All RLS tests passed.'
