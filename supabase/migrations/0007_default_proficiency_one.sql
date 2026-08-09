-- New nodes/edges should start at 1 rep (adding something you just
-- learned/drilled counts as the first repetition), not 0.

alter table user_nodes alter column proficiency set default 1;
alter table user_edges alter column proficiency set default 1;
