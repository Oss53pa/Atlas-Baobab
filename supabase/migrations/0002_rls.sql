-- Atlas Baobab — RLS (CDC §6.1 rôles, §7.1 archétype). Tables préfixées `ab_`.
-- Accès à une donnée enfant SSI membership actif (accepted_at not null and
-- revoked_at is null) pour auth.uid() sur le child_id, granularité de rôle §6.1.
-- ⚠ Recette sécurité §13.3 : accès croisé entre enfants, révocation < 1 min.

create or replace function public.ab_has_child_access(p_child_id uuid, p_min_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from ab_memberships m
    where m.child_id = p_child_id
      and m.user_id = auth.uid()
      and m.accepted_at is not null
      and m.revoked_at is null
      and m.role = any (p_min_roles)
  );
$$;

revoke all on function public.ab_has_child_access(uuid, text[]) from public;
grant execute on function public.ab_has_child_access(uuid, text[]) to authenticated;

alter table ab_children                     enable row level security;
alter table ab_memberships                  enable row level security;
alter table ab_observations                 enable row level security;
alter table ab_incidents                    enable row level security;
alter table ab_twin_profiles                enable row level security;
alter table ab_assessments                  enable row level security;
alter table ab_assessment_items             enable row level security;
alter table ab_game_sessions                enable row level security;
alter table ab_activities                   enable row level security;
alter table ab_activity_logs                enable row level security;
alter table ab_aac_boards                   enable row level security;
alter table ab_aac_cards                    enable row level security;
alter table ab_aac_usage_events             enable row level security;
alter table ab_orientation_recommendations  enable row level security;
alter table ab_skill_portfolio_entries      enable row level security;
alter table ab_report_snapshots             enable row level security;
alter table ab_subscriptions                enable row level security;
alter table ab_audit_log                    enable row level security;

-- ── children ───────────────────────────────────────────────────────────────
create policy ab_children_select on ab_children for select to authenticated
  using (ab_has_child_access(id,
    array['parent_admin','parent','family_caregiver','paid_caregiver','professional']));
create policy ab_children_insert on ab_children for insert to authenticated
  with check (created_by = auth.uid());
create policy ab_children_update on ab_children for update to authenticated
  using (ab_has_child_access(id, array['parent_admin','parent']))
  with check (ab_has_child_access(id, array['parent_admin','parent']));

-- ── memberships ────────────────────────────────────────────────────────────
create policy ab_memberships_select on ab_memberships for select to authenticated
  using (user_id = auth.uid() or ab_has_child_access(child_id, array['parent_admin','parent']));
create policy ab_memberships_insert on ab_memberships for insert to authenticated
  with check (
    ab_has_child_access(child_id, array['parent_admin'])
    or (
      user_id = auth.uid() and role = 'parent_admin'
      and exists (select 1 from ab_children c where c.id = child_id and c.created_by = auth.uid())
    )
  );
create policy ab_memberships_update on ab_memberships for update to authenticated
  using (ab_has_child_access(child_id, array['parent_admin']))
  with check (ab_has_child_access(child_id, array['parent_admin']));

-- ── observations ───────────────────────────────────────────────────────────
create policy ab_observations_insert on ab_observations for insert to authenticated
  with check (
    exists (
      select 1 from ab_memberships m
      where m.id = author_membership_id and m.user_id = auth.uid()
        and m.child_id = ab_observations.child_id
        and m.role in ('parent_admin','parent','family_caregiver','paid_caregiver')
        and m.accepted_at is not null and m.revoked_at is null
    )
  );
create policy ab_observations_select on ab_observations for select to authenticated
  using (
    ab_has_child_access(child_id, array['parent_admin','parent','professional'])
    or exists (
      select 1 from ab_memberships m
      where m.id = ab_observations.author_membership_id and m.user_id = auth.uid()
        and m.child_id = ab_observations.child_id and m.role = 'family_caregiver'
        and m.accepted_at is not null and m.revoked_at is null
    )
  );
create policy ab_observations_update on ab_observations for update to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent']))
  with check (ab_has_child_access(child_id, array['parent_admin','parent']));

-- ── incidents ──────────────────────────────────────────────────────────────
create policy ab_incidents_insert on ab_incidents for insert to authenticated
  with check (ab_has_child_access(child_id,
    array['parent_admin','parent','family_caregiver','paid_caregiver']));
create policy ab_incidents_select on ab_incidents for select to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent','professional']));
create policy ab_incidents_update on ab_incidents for update to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent']))
  with check (ab_has_child_access(child_id, array['parent_admin','parent']));

-- ── twin_profiles ──────────────────────────────────────────────────────────
create policy ab_twin_select on ab_twin_profiles for select to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent','professional']));
create policy ab_twin_insert on ab_twin_profiles for insert to authenticated
  with check (ab_has_child_access(child_id, array['parent_admin','parent']));

-- ── assessments / items ────────────────────────────────────────────────────
create policy ab_assessments_select on ab_assessments for select to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent','professional']));
create policy ab_assessments_write on ab_assessments for all to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent']))
  with check (ab_has_child_access(child_id, array['parent_admin','parent']));
create policy ab_assessment_items_select on ab_assessment_items for select to authenticated
  using (exists (select 1 from ab_assessments a where a.id = assessment_id
    and ab_has_child_access(a.child_id, array['parent_admin','parent','professional'])));
create policy ab_assessment_items_write on ab_assessment_items for all to authenticated
  using (exists (select 1 from ab_assessments a where a.id = assessment_id
    and ab_has_child_access(a.child_id, array['parent_admin','parent'])))
  with check (exists (select 1 from ab_assessments a where a.id = assessment_id
    and ab_has_child_access(a.child_id, array['parent_admin','parent'])));

-- ── game_sessions ──────────────────────────────────────────────────────────
create policy ab_game_sessions_insert on ab_game_sessions for insert to authenticated
  with check (ab_has_child_access(child_id,
    array['parent_admin','parent','family_caregiver','paid_caregiver']));
create policy ab_game_sessions_select on ab_game_sessions for select to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent','professional']));

-- ── activities (catalogue public validé) ───────────────────────────────────
create policy ab_activities_select on ab_activities for select to authenticated using (true);

-- ── activity_logs ──────────────────────────────────────────────────────────
create policy ab_activity_logs_insert on ab_activity_logs for insert to authenticated
  with check (exists (select 1 from ab_memberships m where m.id = author_membership_id
    and m.user_id = auth.uid() and m.child_id = ab_activity_logs.child_id
    and m.role in ('parent_admin','parent','family_caregiver','paid_caregiver')
    and m.accepted_at is not null and m.revoked_at is null));
create policy ab_activity_logs_select on ab_activity_logs for select to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent','professional']));

-- ── CAA boards / cards ─────────────────────────────────────────────────────
create policy ab_aac_boards_select on ab_aac_boards for select to authenticated
  using (ab_has_child_access(child_id,
    array['parent_admin','parent','family_caregiver','paid_caregiver','professional']));
create policy ab_aac_boards_write on ab_aac_boards for all to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent']))
  with check (ab_has_child_access(child_id, array['parent_admin','parent']));
create policy ab_aac_cards_select on ab_aac_cards for select to authenticated
  using (exists (select 1 from ab_aac_boards b where b.id = board_id
    and ab_has_child_access(b.child_id,
      array['parent_admin','parent','family_caregiver','paid_caregiver','professional'])));
create policy ab_aac_cards_write on ab_aac_cards for all to authenticated
  using (exists (select 1 from ab_aac_boards b where b.id = board_id
    and ab_has_child_access(b.child_id, array['parent_admin','parent'])))
  with check (exists (select 1 from ab_aac_boards b where b.id = board_id
    and ab_has_child_access(b.child_id, array['parent_admin','parent'])));

-- ── aac_usage_events ───────────────────────────────────────────────────────
create policy ab_aac_usage_insert on ab_aac_usage_events for insert to authenticated
  with check (ab_has_child_access(child_id,
    array['parent_admin','parent','family_caregiver','paid_caregiver']));
create policy ab_aac_usage_select on ab_aac_usage_events for select to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent','professional']));

-- ── orientation / portfolio / reports ──────────────────────────────────────
create policy ab_orientation_select on ab_orientation_recommendations for select to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent','professional']));
create policy ab_orientation_insert on ab_orientation_recommendations for insert to authenticated
  with check (ab_has_child_access(child_id, array['parent_admin','parent']));

create policy ab_portfolio_select on ab_skill_portfolio_entries for select to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent','professional']));
create policy ab_portfolio_write on ab_skill_portfolio_entries for all to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent']))
  with check (ab_has_child_access(child_id, array['parent_admin','parent']));

create policy ab_report_select on ab_report_snapshots for select to authenticated
  using (ab_has_child_access(child_id, array['parent_admin','parent','professional']));
create policy ab_report_insert on ab_report_snapshots for insert to authenticated
  with check (exists (select 1 from ab_memberships m where m.id = generated_by
    and m.user_id = auth.uid() and m.child_id = ab_report_snapshots.child_id
    and m.role in ('parent_admin','parent','professional')
    and m.accepted_at is not null and m.revoked_at is null));

-- ── subscriptions (propriétaire) ───────────────────────────────────────────
create policy ab_subscriptions_all on ab_subscriptions for all to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- ── audit_log : aucune policy client (écrit via triggers/service role) ─────
