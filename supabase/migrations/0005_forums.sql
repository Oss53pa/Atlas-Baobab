-- Atlas Baobab — Forums parents (avenant CDC C01 §B6). Tables préfixées `ab_`.
-- Déployé sur le projet dédié easoqoswtmvtkdwwkqtc (Atlas Studio — Applications Mobiles).
create table ab_forums (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  age_band text,
  created_at timestamptz not null default now()
);
create table ab_forum_threads (
  id uuid primary key default gen_random_uuid(),
  forum_id uuid not null references ab_forums(id),
  author_user_id uuid not null references auth.users(id),
  pseudonym text not null,
  title text not null,
  body text not null,
  is_anonymous boolean not null default false,
  helped_count int not null default 0,
  status text not null default 'published' check (status in ('published','quarantined','removed')),
  created_at timestamptz not null default now()
);
create index ab_forum_threads_forum_idx on ab_forum_threads (forum_id, created_at desc);
create table ab_forum_posts (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references ab_forum_threads(id),
  author_user_id uuid not null references auth.users(id),
  pseudonym text not null,
  body text not null,
  helped_count int not null default 0,
  status text not null default 'published' check (status in ('published','quarantined','removed')),
  created_at timestamptz not null default now()
);
create index ab_forum_posts_thread_idx on ab_forum_posts (thread_id, created_at);
create table ab_mentorships (
  id uuid primary key default gen_random_uuid(),
  mentor_user_id uuid not null references auth.users(id),
  mentee_user_id uuid not null references auth.users(id),
  thread_id uuid not null references ab_forum_threads(id),
  charter_version text not null,
  status text not null default 'active' check (status in ('active','ended','suspended')),
  created_at timestamptz not null default now()
);
create table ab_moderation_reports (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('thread','post')),
  target_id uuid not null,
  reporter_user_id uuid not null references auth.users(id),
  reason text not null,
  resolved_by uuid,
  resolution text,
  created_at timestamptz not null default now()
);

alter table ab_forums enable row level security;
alter table ab_forum_threads enable row level security;
alter table ab_forum_posts enable row level security;
alter table ab_mentorships enable row level security;
alter table ab_moderation_reports enable row level security;

create policy ab_forums_select on ab_forums for select to authenticated using (true);
create policy ab_forum_threads_select on ab_forum_threads for select to authenticated
  using (status = 'published' or author_user_id = auth.uid());
create policy ab_forum_threads_insert on ab_forum_threads for insert to authenticated
  with check (author_user_id = auth.uid());
create policy ab_forum_posts_select on ab_forum_posts for select to authenticated
  using (status = 'published' or author_user_id = auth.uid());
create policy ab_forum_posts_insert on ab_forum_posts for insert to authenticated
  with check (author_user_id = auth.uid());
create policy ab_reports_insert on ab_moderation_reports for insert to authenticated
  with check (reporter_user_id = auth.uid());
create policy ab_mentorships_select on ab_mentorships for select to authenticated
  using (mentor_user_id = auth.uid() or mentee_user_id = auth.uid());
create policy ab_mentorships_insert on ab_mentorships for insert to authenticated
  with check (mentor_user_id = auth.uid() or mentee_user_id = auth.uid());

revoke execute on function public.ab_has_child_access(uuid, text[]) from anon;
