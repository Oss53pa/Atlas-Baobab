-- Atlas Baobab — schéma initial (CDC §7)
-- Base Supabase PARTAGÉE multi-apps Atlas Studio : convention maison = préfixe
-- par app. Toutes les tables Atlas Baobab sont préfixées `ab_` (évite les
-- collisions avec public.subscriptions / public.audit_log existants, reste dans
-- le schéma public déjà exposé à PostgREST).
-- Conventions : snake_case, uuid gen_random_uuid(), created_at/updated_at timestamptz,
-- soft delete par deleted_at, RLS activée sur toutes les tables (voir 0002).

-- Trigger utilitaire (préfixé pour ne pas heurter un set_updated_at global).
create or replace function public.ab_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── Entité centrale ────────────────────────────────────────────────────────
create table ab_children (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  birth_date date not null,
  avatar_key text,
  active_theme text not null default 'savane'
    check (active_theme in ('savane','lagune','coton','terre','brume')),
  screen_quota_minutes int not null default 15,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create trigger ab_children_set_updated_at
  before update on ab_children
  for each row execute function public.ab_set_updated_at();

create table ab_memberships (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in
    ('parent_admin','parent','family_caregiver','paid_caregiver','teacher','professional')),
  invited_by uuid references auth.users(id),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (child_id, user_id)
);
create index ab_memberships_user_child_idx on ab_memberships (user_id, child_id);
create index ab_memberships_child_idx on ab_memberships (child_id);

-- ── Flux d'observation ─────────────────────────────────────────────────────
create table ab_observations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  author_membership_id uuid not null references ab_memberships(id),
  kind text not null check (kind in
    ('mood','incident','success','sleep','meal','event','school','free_note')),
  intensity smallint check (intensity between 1 and 5),
  context jsonb not null default '{}',
  voice_transcript text,
  occurred_at timestamptz not null,
  device_id text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index ab_observations_child_time_idx on ab_observations (child_id, occurred_at desc);

create table ab_incidents (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  observation_id uuid references ab_observations(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  suspected_trigger text,
  what_helped text[],
  guidance_id uuid,
  guidance_feedback text check (guidance_feedback in ('helped','partial','no')),
  created_at timestamptz not null default now()
);
create index ab_incidents_child_time_idx on ab_incidents (child_id, started_at desc);

-- ── Jumeau versionné ───────────────────────────────────────────────────────
create table ab_twin_profiles (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  version int not null,
  algorithm_version text not null,
  profile jsonb not null,
  computed_at timestamptz not null default now(),
  unique (child_id, version)
);

-- ── Évaluation ─────────────────────────────────────────────────────────────
create table ab_assessments (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  kind text not null check (kind in ('initial','quarterly')),
  status text not null default 'in_progress'
    check (status in ('in_progress','completed')),
  referential_version text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index ab_assessments_child_idx on ab_assessments (child_id);

create table ab_assessment_items (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references ab_assessments(id),
  domain text not null check (domain in
    ('communication','autonomy','social','motor','regulation','cognitive')),
  item_code text not null,
  source text not null check (source in ('game','parent_questionnaire','situation')),
  score numeric not null,
  evidence jsonb default '{}',
  created_at timestamptz not null default now()
);
create index ab_assessment_items_assessment_idx on ab_assessment_items (assessment_id);

-- ── Jeux et télémétrie ─────────────────────────────────────────────────────
create table ab_game_sessions (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  game_code text not null,
  difficulty_level int not null,
  duration_seconds int not null,
  telemetry jsonb not null,
  played_at timestamptz not null,
  device_id text not null,
  created_at timestamptz not null default now()
);
create index ab_game_sessions_child_time_idx on ab_game_sessions (child_id, played_at desc);

-- ── Activités hors-écran ───────────────────────────────────────────────────
create table ab_activities (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  domain text not null,
  title text not null,
  instructions jsonb not null,
  min_age int, max_age int,
  clinical_approved_by text,
  created_at timestamptz not null default now()
);

create table ab_activity_logs (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  activity_id uuid not null references ab_activities(id),
  author_membership_id uuid not null references ab_memberships(id),
  outcome jsonb not null,
  done_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index ab_activity_logs_child_idx on ab_activity_logs (child_id, done_at desc);

-- ── CAA (sanctuarisée) ─────────────────────────────────────────────────────
create table ab_aac_boards (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  grid_rows int not null default 3,
  grid_cols int not null default 4,
  layout jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now()
);
create trigger ab_aac_boards_set_updated_at
  before update on ab_aac_boards
  for each row execute function public.ab_set_updated_at();

create table ab_aac_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references ab_aac_boards(id),
  label text not null,
  picto_key text,
  custom_photo_key text,
  audio_key text,
  category text not null,
  created_at timestamptz not null default now()
);
create index ab_aac_cards_board_idx on ab_aac_cards (board_id);

create table ab_aac_usage_events (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  card_id uuid not null references ab_aac_cards(id),
  context jsonb default '{}',
  pressed_at timestamptz not null,
  device_id text not null
);
create index ab_aac_usage_events_child_time_idx on ab_aac_usage_events (child_id, pressed_at desc);

-- ── Orientation et portfolio ───────────────────────────────────────────────
create table ab_orientation_recommendations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  age_band text not null check (age_band in ('3-6','7-12','13-18')),
  recommendation jsonb not null,
  twin_version int not null,
  assessment_id uuid references ab_assessments(id),
  rules_version text not null,
  created_at timestamptz not null default now()
);

create table ab_skill_portfolio_entries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  domain text not null,
  title text not null,
  evidence_kind text check (evidence_kind in ('video','photo','result','report')),
  storage_key text,
  measured_value jsonb,
  recorded_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ── Reporting ──────────────────────────────────────────────────────────────
create table ab_report_snapshots (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references ab_children(id),
  kind text not null check (kind in
    ('monthly','bilan360','crisis_trend','aac_progress','activities','portfolio_export')),
  period_start date, period_end date,
  payload jsonb not null,
  pdf_storage_key text,
  generated_by uuid not null references ab_memberships(id),
  created_at timestamptz not null default now()
);

-- ── Abonnements (Money bigint, jamais de floats) ───────────────────────────
create table ab_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id),
  plan text not null check (plan in ('free','family','family_plus','b2b_school')),
  amount_xof bigint not null,
  provider text check (provider in ('orange_money','mtn_momo','wave')),
  provider_ref text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  status text not null default 'active'
    check (status in ('active','past_due','canceled')),
  created_at timestamptz not null default now()
);
create index ab_subscriptions_owner_idx on ab_subscriptions (owner_user_id);

create table ab_audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null,
  actor uuid,
  diff jsonb,
  created_at timestamptz not null default now()
);
