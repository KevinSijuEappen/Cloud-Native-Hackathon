create table if not exists public.participant_connections (
  id uuid primary key default gen_random_uuid(),
  event_id text not null,
  requester_user_id text not null,
  recipient_user_id text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_user_id <> recipient_user_id),
  foreign key (event_id, requester_user_id)
    references public.conference_participants (event_id, clerk_user_id) on delete cascade,
  foreign key (event_id, recipient_user_id)
    references public.conference_participants (event_id, clerk_user_id) on delete cascade
);

create unique index if not exists participant_connections_one_per_pair
  on public.participant_connections (
    event_id,
    least(requester_user_id, recipient_user_id),
    greatest(requester_user_id, recipient_user_id)
  );

alter table public.participant_connections enable row level security;

grant select, insert, delete on public.participant_connections to authenticated;
grant update (status, responded_at) on public.participant_connections to authenticated;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'participant_connections' and policyname = 'Participants read their connection requests') then
    create policy "Participants read their connection requests"
      on public.participant_connections for select to authenticated
      using (requester_user_id = (select auth.jwt() ->> 'sub') or recipient_user_id = (select auth.jwt() ->> 'sub'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'participant_connections' and policyname = 'Participants request a discoverable profile') then
    create policy "Participants request a discoverable profile"
      on public.participant_connections for insert to authenticated
      with check (
        requester_user_id = (select auth.jwt() ->> 'sub')
        and exists (
          select 1 from public.conference_participants target
          where target.event_id = participant_connections.event_id
            and target.clerk_user_id = participant_connections.recipient_user_id
            and target.discoverable = true
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'participant_connections' and policyname = 'Recipients respond to pending requests') then
    create policy "Recipients respond to pending requests"
      on public.participant_connections for update to authenticated
      using (recipient_user_id = (select auth.jwt() ->> 'sub') and status = 'pending')
      with check (recipient_user_id = (select auth.jwt() ->> 'sub') and status in ('accepted', 'declined'));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'participant_connections' and policyname = 'Requesters cancel pending requests') then
    create policy "Requesters cancel pending requests"
      on public.participant_connections for delete to authenticated
      using (requester_user_id = (select auth.jwt() ->> 'sub') and status = 'pending');
  end if;
end $$;
