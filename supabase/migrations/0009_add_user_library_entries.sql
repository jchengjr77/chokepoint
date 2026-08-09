-- User-defined library entries: lets a user add a position/submission
-- that isn't in the curated library.json, without it becoming visible to
-- other users. These merge with the static library at lookup time
-- (client-side) so everything downstream (layout, filters, import/export)
-- treats a custom entry the same as a curated one.

create table if not exists user_library_entries (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  label text not null,
  type text not null check (type in ('position', 'submission')),
  advantage smallint check (advantage between -5 and 5),
  rulesets text[] not null default array['gi', 'nogi'],
  created_at timestamptz default now()
);

create index if not exists user_library_entries_user_id_idx on user_library_entries(user_id);

alter table user_library_entries enable row level security;

create policy "Users can CRUD their own library entries"
  on user_library_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
