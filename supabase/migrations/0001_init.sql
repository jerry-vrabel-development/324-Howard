-- =============================================================================
-- 324 S Howard St — initial schema
--
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Who can do what (enforced by Row Level Security, not by the website):
--
--                      visitors   landowner                  admin (you)
--   photos, journal    published  everything                 everything, edit
--   tasks              —          read; request new tasks;   everything, edit
--                                 edit own pending requests
--   comments/feedback  —          read; write own            read; write own; delete any
--   work sessions      —          read                       everything, edit
--
-- People only get access once they have a row in public.profiles, which only
-- you can create (see supabase/README.md). Signing in alone grants nothing.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Members and roles
-- ---------------------------------------------------------------------------

create type public.member_role as enum ('admin', 'landowner');

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role         public.member_role not null,
  created_at   timestamptz not null default now()
);

-- SECURITY DEFINER so policies can look up the caller's role without
-- recursing into the profiles table's own RLS.
create function public.member_role()
returns public.member_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = auth.uid() $$;

create function public.is_member()
returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid()) $$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(public.member_role() = 'admin', false) $$;

revoke execute on function public.member_role(), public.is_member(), public.is_admin() from public;
grant execute on function public.member_role(), public.is_member(), public.is_admin()
  to anon, authenticated;

-- Shared value lists. Keep in sync with src/config/constants.ts.
create domain public.room_id as text check (value in (
  'exterior', 'living-room', 'kitchen', 'master-bedroom', 'bathroom', 'basement', 'general'
));

-- ---------------------------------------------------------------------------
-- Photos (files live in the "photos" storage bucket; these rows describe them)
-- ---------------------------------------------------------------------------

create table public.photos (
  id          uuid primary key default gen_random_uuid(),
  room        public.room_id not null,
  title       text not null check (char_length(title) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  before_path text check (before_path is null or char_length(before_path) <= 500),
  after_path  text not null check (char_length(after_path) <= 500),
  taken_on    date not null default current_date,
  published   boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tasks, feedback and time
-- ---------------------------------------------------------------------------

create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(title) between 1 and 160),
  room            public.room_id not null,
  -- 'requested' = submitted by the landowner, waiting for you to accept or decline.
  status          text not null default 'todo'
                  check (status in ('requested', 'todo', 'in-progress', 'completed', 'declined')),
  priority        text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  estimated_hours numeric(6, 2) not null default 0 check (estimated_hours >= 0),
  notes           text not null default '' check (char_length(notes) <= 4000),
  requested_by    uuid references public.profiles (id) on delete set null,
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;

create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

create table public.task_comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  author_id  uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index on public.task_comments (task_id, created_at);

-- Logged time is a list of sessions, not a single number, so hours can be
-- audited and a running timer survives across devices (ended_at is null).
create table public.work_sessions (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  started_at timestamptz not null default now(),
  ended_at   timestamptz check (ended_at is null or ended_at >= started_at),
  note       text not null default ''
);
create index on public.work_sessions (task_id);
-- At most one running timer per person.
create unique index one_running_timer_per_user on public.work_sessions (user_id)
  where ended_at is null;

-- Hours per task. security_invoker makes the view obey the caller's RLS.
create view public.task_hours with (security_invoker = true) as
select
  t.id as task_id,
  coalesce(round(sum(extract(epoch from (s.ended_at - s.started_at)) / 3600)::numeric, 2), 0)
    as logged_hours
from public.tasks t
left join public.work_sessions s on s.task_id = t.id and s.ended_at is not null
group by t.id;

-- ---------------------------------------------------------------------------
-- Journal
-- ---------------------------------------------------------------------------

create table public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 160),
  tag        text not null check (tag in (
               'historical-finding', 'plumbing-electrical', 'framing-drywall',
               'materials-costs', 'live-in-reflection')),
  content    text not null default '' check (char_length(content) <= 20000),
  entry_date date not null default current_date,
  published  boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.photos          enable row level security;
alter table public.tasks           enable row level security;
alter table public.task_comments   enable row level security;
alter table public.work_sessions   enable row level security;
alter table public.journal_entries enable row level security;

-- Profiles: members can see each other's names. Only the dashboard (you) edits them.
create policy "members read profiles" on public.profiles
  for select to authenticated using (public.is_member());

-- Photos and journal: published rows are public; members see drafts; admin writes.
create policy "read published photos" on public.photos
  for select to anon, authenticated using (published or public.is_member());
create policy "admin writes photos" on public.photos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "read published journal" on public.journal_entries
  for select to anon, authenticated using (published or public.is_member());
create policy "admin writes journal" on public.journal_entries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Tasks: members only. The landowner can file requests and edit them until you act on them.
create policy "members read tasks" on public.tasks
  for select to authenticated using (public.is_member());
create policy "admin writes tasks" on public.tasks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "landowner requests tasks" on public.tasks
  for insert to authenticated
  with check (
    public.member_role() = 'landowner'
    and status = 'requested'
    and requested_by = auth.uid()
  );
create policy "landowner edits pending requests" on public.tasks
  for update to authenticated
  using (public.member_role() = 'landowner' and requested_by = auth.uid() and status = 'requested')
  with check (public.member_role() = 'landowner' and requested_by = auth.uid() and status = 'requested');
create policy "landowner withdraws pending requests" on public.tasks
  for delete to authenticated
  using (public.member_role() = 'landowner' and requested_by = auth.uid() and status = 'requested');

-- Comments: any member reads and writes their own; admin can remove any.
create policy "members read comments" on public.task_comments
  for select to authenticated using (public.is_member());
create policy "members write own comments" on public.task_comments
  for insert to authenticated with check (public.is_member() and author_id = auth.uid());
create policy "authors edit own comments" on public.task_comments
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "authors or admin delete comments" on public.task_comments
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- Work sessions: members read (so the landowner sees hours); only admin logs time.
create policy "members read sessions" on public.work_sessions
  for select to authenticated using (public.is_member());
create policy "admin writes sessions" on public.work_sessions
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin() and user_id = auth.uid());

-- Table privileges (RLS above decides which rows). Stated explicitly rather
-- than relying on project defaults.
grant select on public.photos, public.journal_entries to anon;
grant select, insert, update, delete
  on public.photos, public.journal_entries, public.tasks, public.task_comments, public.work_sessions
  to authenticated;
grant select on public.profiles to authenticated;
grant select on public.task_hours to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: public "photos" bucket, admin-only uploads
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Files are served through public URLs, so visitors need no policy to view them.
-- The admin also needs SELECT to list files and to replace one (upsert).
create policy "admin lists photos" on storage.objects
  for select to authenticated using (bucket_id = 'photos' and public.is_admin());
create policy "admin uploads photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos' and public.is_admin());
create policy "admin updates photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'photos' and public.is_admin())
  with check (bucket_id = 'photos' and public.is_admin());
create policy "admin deletes photos" on storage.objects
  for delete to authenticated using (bucket_id = 'photos' and public.is_admin());
