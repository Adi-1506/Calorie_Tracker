-- Core schema for the calorie tracker.
-- Every user-owned table carries user_id and is locked down by RLS in the
-- next migration. Primary keys are random UUIDs (security item 7).

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('user', 'admin');
create type public.sex as enum ('female', 'male', 'other');
create type public.activity_level as enum ('sedentary', 'light', 'moderate', 'active', 'very_active');
create type public.goal_type as enum ('lose', 'maintain', 'gain', 'keto', 'high_protein', 'diabetic_friendly');
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.food_source as enum ('system', 'open_food_facts', 'usda', 'indian_seed', 'user');
create type public.target_source as enum ('calculated', 'manual', 'adaptive');
create type public.review_status as enum ('pending', 'published', 'rejected');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  display_name            text check (char_length(display_name) <= 60),
  date_of_birth           date check (date_of_birth > date '1900-01-01'),
  sex                     public.sex,
  height_cm               numeric(5, 1) check (height_cm between 50 and 272),
  activity_level          public.activity_level,
  goal                    public.goal_type,
  diet_type               text check (char_length(diet_type) <= 40),
  allergies               text[] not null default '{}' check (cardinality(allergies) <= 30),
  unit_system             text not null default 'metric' check (unit_system in ('metric', 'imperial')),
  locale                  text not null default 'en' check (char_length(locale) <= 10),
  hide_numbers            boolean not null default false,   -- security item 49: hide weight/calorie numbers
  onboarding_completed_at timestamptz,
  health_data_consent_at  timestamptz,                      -- explicit consent for health data (section 2)
  age_confirmed_at        timestamptz,                      -- security item 50
  -- Server-managed fields. Users can never write these (security item 8).
  role                    public.app_role not null default 'user',
  is_premium              boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Security item 50: no weight-loss goal for anyone under 18.
create or replace function public.enforce_minor_goal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.goal = 'lose'
     and new.date_of_birth is not null
     and new.date_of_birth > (current_date - interval '18 years') then
    raise exception 'Weight-loss goals are not available for users under 18'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger profiles_minor_goal before insert or update on public.profiles
  for each row execute function public.enforce_minor_goal();

-- Create a profile row automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Nutrition targets (history kept so adaptive changes are auditable)
-- ---------------------------------------------------------------------------
create table public.nutrition_targets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  effective_from date not null default current_date,
  -- Security item 49: hard floor/ceiling. Sex-specific floors are enforced in the app.
  calories       integer not null check (calories between 1200 and 6000),
  protein_g      integer not null check (protein_g between 0 and 500),
  carbs_g        integer not null check (carbs_g between 0 and 1000),
  fat_g          integer not null check (fat_g between 0 and 400),
  fiber_g        integer check (fiber_g between 0 and 150),
  water_ml       integer check (water_ml between 0 and 10000),
  source         public.target_source not null default 'manual',
  created_at     timestamptz not null default now(),
  unique (user_id, effective_from)
);

-- ---------------------------------------------------------------------------
-- Food database
-- owner_id NULL = shared catalogue entry (seeded or imported by the server).
-- owner_id set  = a user's custom food, visible only to them.
-- ---------------------------------------------------------------------------
create table public.foods (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 200),
  name_local      text check (char_length(name_local) <= 200),   -- e.g. Malayalam / Tamil name
  brand           text check (char_length(brand) <= 120),
  barcode         text check (barcode ~ '^[0-9]{8,14}$'),
  source          public.food_source not null default 'user',
  external_id     text check (char_length(external_id) <= 64),
  region          text check (char_length(region) <= 60),         -- e.g. 'kerala', 'tamil_nadu'
  is_verified     boolean not null default false,                 -- server-managed (security item 8)
  -- Nutrients per 100 g
  calories        numeric(7, 2) not null check (calories >= 0 and calories <= 900),
  protein_g       numeric(6, 2) not null default 0 check (protein_g >= 0),
  carbs_g         numeric(6, 2) not null default 0 check (carbs_g >= 0),
  fat_g           numeric(6, 2) not null default 0 check (fat_g >= 0),
  fiber_g         numeric(6, 2) check (fiber_g >= 0),
  sugar_g         numeric(6, 2) check (sugar_g >= 0),
  sodium_mg       numeric(8, 2) check (sodium_mg >= 0),
  -- 80+ micronutrients keyed by a fixed code list validated in the app (Zod).
  micronutrients  jsonb not null default '{}' check (jsonb_typeof(micronutrients) = 'object'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Catalogue rows must not be marked user-submitted and vice versa.
  constraint foods_owner_source check (
    (owner_id is null and source <> 'user') or (owner_id is not null and source = 'user')
  )
);

create index foods_barcode_idx on public.foods (barcode) where barcode is not null;
create index foods_owner_idx on public.foods (owner_id);
create unique index foods_external_uq on public.foods (source, external_id) where external_id is not null;

create trigger foods_updated_at before update on public.foods
  for each row execute function public.set_updated_at();

-- Named portion sizes, e.g. "1 katori (150 g)", "1 medium dosa (90 g)".
create table public.food_servings (
  id       uuid primary key default gen_random_uuid(),
  food_id  uuid not null references public.foods (id) on delete cascade,
  label    text not null check (char_length(label) between 1 and 80),
  grams    numeric(7, 2) not null check (grams > 0 and grams <= 5000)
);

create index food_servings_food_idx on public.food_servings (food_id);

create table public.favorite_foods (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  food_id    uuid not null references public.foods (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, food_id)
);

-- ---------------------------------------------------------------------------
-- Recipes
-- ---------------------------------------------------------------------------
create table public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 200),
  servings    numeric(5, 2) not null default 1 check (servings > 0 and servings <= 100),
  source_url  text check (char_length(source_url) <= 2048 and source_url ~ '^https?://'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger recipes_updated_at before update on public.recipes
  for each row execute function public.set_updated_at();

create table public.recipe_ingredients (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  food_id    uuid not null references public.foods (id) on delete restrict,
  grams      numeric(7, 2) not null check (grams > 0 and grams <= 10000)
);

create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);

-- ---------------------------------------------------------------------------
-- Logging
-- ---------------------------------------------------------------------------
create table public.meal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_on   date not null default current_date,
  meal        public.meal_type not null,
  food_id     uuid references public.foods (id) on delete set null,
  recipe_id   uuid references public.recipes (id) on delete set null,
  label       text not null check (char_length(label) between 1 and 200),
  grams       numeric(7, 2) check (grams > 0 and grams <= 10000),
  -- Nutrient snapshot at log time so history survives food edits.
  calories    numeric(7, 2) not null check (calories >= 0 and calories <= 10000),
  protein_g   numeric(6, 2) not null default 0 check (protein_g >= 0),
  carbs_g     numeric(6, 2) not null default 0 check (carbs_g >= 0),
  fat_g       numeric(6, 2) not null default 0 check (fat_g >= 0),
  nutrients   jsonb not null default '{}' check (jsonb_typeof(nutrients) = 'object'),
  is_quick_add boolean not null default false,
  client_id   uuid,                                -- idempotency key for offline sync
  created_at  timestamptz not null default now(),
  unique (user_id, client_id)
);

create index meal_entries_user_day_idx on public.meal_entries (user_id, logged_on);

create table public.water_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_on  date not null default current_date,
  ml         integer not null check (ml > 0 and ml <= 5000),
  client_id  uuid,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);

create index water_logs_user_day_idx on public.water_logs (user_id, logged_on);

-- ---------------------------------------------------------------------------
-- Sensitive health data (security item 5)
-- Values are encrypted in the app server (AES-256-GCM, key in a server-only
-- env var) before they reach the database, so the DB only stores ciphertext.
-- ---------------------------------------------------------------------------
create table public.weight_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on     date not null default current_date,
  weight_kg_enc   text not null check (char_length(weight_kg_enc) <= 512),
  created_at      timestamptz not null default now(),
  unique (user_id, measured_on)
);

create table public.body_measurements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  measured_on  date not null default current_date,
  data_enc     text not null check (char_length(data_enc) <= 4096),   -- encrypted JSON (waist, hips, ...)
  created_at   timestamptz not null default now()
);

create table public.progress_photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path  text not null unique check (char_length(storage_path) <= 300),
  taken_on      date not null default current_date,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Habits and gamification
-- ---------------------------------------------------------------------------
create table public.fasting_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  target_hours  numeric(4, 1) not null check (target_hours > 0 and target_hours <= 72),
  check (ended_at is null or ended_at > started_at)
);

create table public.badges (
  code         text primary key check (code ~ '^[a-z0-9_]{2,40}$'),
  name         text not null,
  description  text not null
);

-- Awarded by the server only; users can read their own.
create table public.user_badges (
  user_id     uuid not null references auth.users (id) on delete cascade,
  badge_code  text not null references public.badges (code) on delete cascade,
  awarded_at  timestamptz not null default now(),
  primary key (user_id, badge_code)
);

-- ---------------------------------------------------------------------------
-- Verified reviews (section 2: real reviews from real accounts only)
-- ---------------------------------------------------------------------------
create table public.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  title       text check (char_length(title) <= 100),
  body        text not null check (char_length(body) between 10 and 2000),
  status      public.review_status not null default 'pending',   -- moderated by server/admin
  created_at  timestamptz not null default now(),
  unique (user_id)                                                 -- one review per account
);

-- ---------------------------------------------------------------------------
-- Server-only tables (no client access at all)
-- ---------------------------------------------------------------------------
create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 100),
  email       text not null check (char_length(email) <= 254),
  message     text not null check (char_length(message) between 1 and 5000),
  created_at  timestamptz not null default now()
);

-- Security item 36: per-user AI quotas.
create table public.ai_usage (
  user_id      uuid not null references auth.users (id) on delete cascade,
  usage_date   date not null default current_date,
  requests     integer not null default 0 check (requests >= 0),
  tokens       integer not null default 0 check (tokens >= 0),
  primary key (user_id, usage_date)
);

-- Security item 31: append-only audit log. No health data, no secrets.
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid,                     -- kept after account deletion for the retention period
  action      text not null check (char_length(action) <= 64),
  ip_hash     text check (char_length(ip_hash) <= 128),
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create or replace function public.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;

create trigger audit_logs_immutable before update or delete on public.audit_logs
  for each row execute function public.prevent_audit_mutation();
