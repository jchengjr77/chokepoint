-- Training log: one row per training event (node/edge proficiency
-- increment), so a calendar view can show what was trained on a given
-- day, not just when a node/edge was first created.

create table if not exists training_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  node_id uuid references user_nodes(id) on delete cascade,
  edge_id uuid references user_edges(id) on delete cascade,
  trained_at timestamptz not null default now(),
  constraint training_log_target_check check (
    (node_id is not null and edge_id is null) or
    (node_id is null and edge_id is not null)
  )
);

create index if not exists training_log_user_id_idx on training_log(user_id);
create index if not exists training_log_trained_at_idx on training_log(trained_at);
create index if not exists training_log_node_id_idx on training_log(node_id);
create index if not exists training_log_edge_id_idx on training_log(edge_id);

alter table training_log enable row level security;

create policy "Users can CRUD their own training log"
  on training_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
