-- Chokepoint initial schema

-- User preferences
create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  ruleset_filter text not null default 'all' check (ruleset_filter in ('all', 'gi', 'nogi')),
  updated_at timestamptz default now()
);

-- User's graph nodes
create table if not exists user_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  library_id text not null,
  type text not null check (type in ('position', 'submission')),
  label text not null,
  notes text default '',
  x float not null default 0,
  y float not null default 0,
  date_added timestamptz default now(),
  unique (user_id, library_id)
);

-- User's graph edges
create table if not exists user_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  source_id uuid references user_nodes(id) on delete cascade,
  target_id uuid references user_nodes(id) on delete cascade,
  label text default '',
  bidirectional boolean default false,
  notes text default '',
  date_added timestamptz default now()
);

create index if not exists user_nodes_user_id_idx on user_nodes(user_id);
create index if not exists user_edges_user_id_idx on user_edges(user_id);
create index if not exists user_edges_source_id_idx on user_edges(source_id);
create index if not exists user_edges_target_id_idx on user_edges(target_id);

-- Row-level security: users can only access their own data
alter table user_nodes enable row level security;
alter table user_edges enable row level security;
alter table user_preferences enable row level security;

create policy "Users can CRUD their own nodes"
  on user_nodes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can CRUD their own edges"
  on user_edges for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can CRUD their own preferences"
  on user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
