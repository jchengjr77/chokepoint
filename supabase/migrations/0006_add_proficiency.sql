-- Proficiency counters: incremented each time a node/edge is trained,
-- via NL confirmation of an already-on-graph match or a manual log action.

alter table user_nodes add column if not exists proficiency integer not null default 0 check (proficiency >= 0);
alter table user_edges add column if not exists proficiency integer not null default 0 check (proficiency >= 0);
