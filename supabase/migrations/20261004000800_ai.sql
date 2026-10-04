-- Step 3d part 2: AI features (security items 35-37).
-- Per-feature daily quotas. The table was never written to before this step,
-- so it's recreated with a feature column in the key.

drop table public.ai_usage;

create table public.ai_usage (
  user_id      uuid not null references auth.users (id) on delete cascade,
  usage_date   date not null default current_date,
  feature      text not null check (feature in ('photo', 'coach')),
  requests     integer not null default 0 check (requests >= 0),
  tokens       integer not null default 0 check (tokens >= 0),
  primary key (user_id, usage_date, feature)
);

alter table public.ai_usage enable row level security;  -- server only, no policies
revoke all on public.ai_usage from anon, authenticated;

-- Takes one request from today's quota. Returns false once the limit is reached.
create or replace function public.consume_ai_quota(p_user uuid, p_feature text, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_requests integer;
begin
  if p_limit < 1 then
    raise exception 'invalid limit';
  end if;

  insert into public.ai_usage as u (user_id, feature, requests)
  values (p_user, p_feature, 1)
  on conflict (user_id, usage_date, feature) do update set requests = u.requests + 1
    where u.requests < p_limit
  returning u.requests into v_requests;

  return v_requests is not null;
end;
$$;

-- Adds the provider's token count to today's row, for cost tracking.
create or replace function public.record_ai_tokens(p_user uuid, p_feature text, p_tokens integer)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage
     set tokens = tokens + greatest(0, least(p_tokens, 1000000))
   where user_id = p_user and usage_date = current_date and feature = p_feature;
$$;

revoke all on function public.consume_ai_quota(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.record_ai_tokens(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.consume_ai_quota(uuid, text, integer) to service_role;
grant execute on function public.record_ai_tokens(uuid, text, integer) to service_role;
