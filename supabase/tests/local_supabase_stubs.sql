-- Minimal stand-ins for the parts of Supabase the migrations depend on, so the
-- schema and RLS policies can be tested on plain Postgres (locally and in CI).
-- Never run this against a real Supabase project.

-- Roles are cluster-wide, so tolerate them existing from an earlier run.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end;
$$;

create schema if not exists extensions;
create schema auth;
create schema storage;

grant usage on schema public, auth, extensions to anon, authenticated, service_role;
grant all on schema public to service_role;

create table auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- Same logic as Supabase's auth.uid(): the "sub" claim of the request JWT.
create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;

create table storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

-- Supabase grants API roles everything on public by default; RLS is what
-- protects the data. Reproduce that so the tests prove our revokes work.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
