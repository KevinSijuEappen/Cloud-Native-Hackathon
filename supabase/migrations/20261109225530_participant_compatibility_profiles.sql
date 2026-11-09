create table if not exists public.conference_participants (
  event_id text not null,
  clerk_user_id text not null,
  event_name text not null,
  display_name text not null,
  role text not null check (role in ('attending', 'presenting')),
  work_situation text check (work_situation in ('working', 'student', 'looking')),
  job_title text not null default '',
  organization text not null default '',
  interests text[] not null default '{}',
  session_room text not null default '',
  session_time text not null default '',
  discoverable boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (event_id, clerk_user_id)
);

comment on table public.conference_participants is
  'Per-event attendee and presenter profile details. Discovery fields are shared only when discoverable is true.';

alter table public.conference_participants enable row level security;

grant select, insert, update, delete on public.conference_participants to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conference_participants' and policyname = 'Users read own or discoverable event profiles') then
    create policy "Users read own or discoverable event profiles"
      on public.conference_participants for select to authenticated
      using (clerk_user_id = (select auth.jwt() ->> 'sub') or discoverable = true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conference_participants' and policyname = 'Users create own event profiles') then
    create policy "Users create own event profiles"
      on public.conference_participants for insert to authenticated
      with check (clerk_user_id = (select auth.jwt() ->> 'sub'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conference_participants' and policyname = 'Users update own event profiles') then
    create policy "Users update own event profiles"
      on public.conference_participants for update to authenticated
      using (clerk_user_id = (select auth.jwt() ->> 'sub'))
      with check (clerk_user_id = (select auth.jwt() ->> 'sub'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'conference_participants' and policyname = 'Users delete own event profiles') then
    create policy "Users delete own event profiles"
      on public.conference_participants for delete to authenticated
      using (clerk_user_id = (select auth.jwt() ->> 'sub'));
  end if;
end $$;
