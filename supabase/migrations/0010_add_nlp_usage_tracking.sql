-- Weekly usage tracking for the NL parsing endpoint (parse-nl edge
-- function), which is the only part of the app that costs real money per
-- call (everything else is free Postgres reads/writes). One row per
-- user per calendar week (week_start = the Monday of that week); the
-- edge function atomically increments this before calling the LLM and
-- rejects the request if the user is already at the weekly cap.

create table if not exists nlp_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  parse_count integer not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, week_start)
);

alter table nlp_usage enable row level security;

-- Users can read their own usage (e.g. to show "12/40 this week" in the
-- UI), but only the edge function's service-role key can write it — a
-- client writing directly could just reset/inflate their own count.
create policy "Users can read their own NLP usage"
  on nlp_usage for select
  using (auth.uid() = user_id);

-- Atomically increments this week's count for a user and returns the
-- new count, creating the row if it doesn't exist yet. Runs as a single
-- statement so concurrent requests from the same user can't race past
-- the cap (e.g. two tabs submitting at once both reading count=39 and
-- both proceeding).
create or replace function increment_nlp_usage(p_user_id uuid, p_week_start date)
returns integer
language sql
security definer
set search_path = public
as $$
  insert into nlp_usage (user_id, week_start, parse_count, updated_at)
  values (p_user_id, p_week_start, 1, now())
  on conflict (user_id, week_start)
  do update set parse_count = nlp_usage.parse_count + 1, updated_at = now()
  returning parse_count;
$$;
