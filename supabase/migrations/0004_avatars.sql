-- Atlas Baobab — Avatars CORTEX (avenant CDC C02 §C2.6). Tables préfixées `ab_`.
-- avatar_key existe déjà (ab_children v1) ; on le contraint + défaut.
update ab_children set avatar_key = 'pousse' where avatar_key is null;
alter table ab_children alter column avatar_key set default 'pousse';
alter table ab_children alter column avatar_key set not null;
alter table ab_children
  add constraint ab_children_avatar_key_chk
    check (avatar_key in ('pousse','luciole','cameleon','tisserin','tortue'));
alter table ab_children
  add column avatar_custom_name text
    check (avatar_custom_name is null or
      (char_length(avatar_custom_name) between 2 and 12
       and avatar_custom_name ~ '^[[:alpha:] ]+$')),
  add column avatar_growth_stage smallint not null default 1
    check (avatar_growth_stage between 1 and 4),
  add column avatar_motion text not null default 'slow'
    check (avatar_motion in ('slow','minimal','static'));

-- NOTE C01 (Forums Vague 3, Insights Vague 4) NON déployé ici : l'Insights est
-- bloqué par le prérequis réglementaire ARTCI (C01 §A7), au même rang que le
-- partenaire clinique. Schémas `insights`/`forums` à créer lors de leurs vagues.
