-- Rename the default theme id from 'chokepoint' to 'albino-preto'.

alter table user_preferences drop constraint if exists user_preferences_theme_check;

update user_preferences set theme = 'albino-preto' where theme = 'chokepoint';

alter table user_preferences
  alter column theme set default 'albino-preto',
  add constraint user_preferences_theme_check
    check (theme in ('albino-preto', 'solarized', 'gruvbox', 'github', 'synthwave84'));
