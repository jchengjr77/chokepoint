-- Add theme + mode preferences alongside the existing ruleset filter.

alter table user_preferences
  add column if not exists theme text not null default 'chokepoint'
    check (theme in ('chokepoint', 'solarized', 'gruvbox', 'github', 'synthwave84')),
  add column if not exists theme_mode text not null default 'dark'
    check (theme_mode in ('dark', 'light'));
