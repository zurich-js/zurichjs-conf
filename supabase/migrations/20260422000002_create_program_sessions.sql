do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'program_session_kind'
  ) then
    create type public.program_session_kind as enum (
      'talk',
      'workshop',
      'panel',
      'keynote',
      'event'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'program_session_status'
  ) then
    create type public.program_session_status as enum (
      'draft',
      'confirmed',
      'published',
      'archived'
    );
  end if;

  if not exists (
    select 1 from pg_type where typname = 'program_session_speaker_role'
  ) then
    create type public.program_session_speaker_role as enum (
      'speaker',
      'panelist',
      'host',
      'mc',
      'instructor'
    );
  end if;
end
$$;

create table if not exists public.program_sessions (
  id uuid primary key default gen_random_uuid(),
  cfp_submission_id uuid null references public.cfp_submissions(id) on delete set null,
  kind public.program_session_kind not null,
  title text not null,
  abstract text null,
  level public.cfp_talk_level null,
  status public.program_session_status not null default 'draft',
  workshop_duration_minutes integer null check (workshop_duration_minutes is null or workshop_duration_minutes > 0),
  workshop_capacity integer null check (workshop_capacity is null or workshop_capacity > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_program_sessions_cfp_submission_id
  on public.program_sessions(cfp_submission_id)
  where cfp_submission_id is not null;

create index if not exists idx_program_sessions_kind on public.program_sessions(kind);
create index if not exists idx_program_sessions_status on public.program_sessions(status);

drop trigger if exists update_program_sessions_updated_at on public.program_sessions;
create trigger update_program_sessions_updated_at
before update on public.program_sessions
for each row
execute function public.update_updated_at_column();

create table if not exists public.program_session_speakers (
  session_id uuid not null references public.program_sessions(id) on delete cascade,
  speaker_id uuid not null references public.cfp_speakers(id) on delete cascade,
  role public.program_session_speaker_role not null default 'speaker',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (session_id, speaker_id)
);

create index if not exists idx_program_session_speakers_speaker_id
  on public.program_session_speakers(speaker_id);

alter table public.program_schedule_items
  add column if not exists session_id uuid null references public.program_sessions(id) on delete set null;

create index if not exists idx_program_schedule_items_session_id
  on public.program_schedule_items(session_id)
  where session_id is not null;

alter table public.workshops
  add column if not exists session_id uuid null references public.program_sessions(id) on delete set null;

create unique index if not exists uq_workshops_session_id
  on public.workshops(session_id)
  where session_id is not null;

comment on table public.program_sessions is 'Post-selection program sessions decoupled from CFP submission intake.';
comment on column public.program_sessions.cfp_submission_id is 'Optional source CFP submission; null for invited/custom sessions and events.';
comment on table public.program_session_speakers is 'Speaker assignments for program sessions.';
comment on column public.program_schedule_items.session_id is 'Preferred link to a program session; submission_id remains for legacy compatibility.';
comment on column public.workshops.session_id is 'Preferred link from a sellable workshop offering to a program session.';

insert into public.program_sessions (
  cfp_submission_id,
  kind,
  title,
  abstract,
  level,
  status,
  workshop_duration_minutes,
  workshop_capacity,
  metadata
)
select
  submission.id,
  case
    when submission.submission_type = 'workshop' then 'workshop'::public.program_session_kind
    when submission.submission_type = 'panel' then 'panel'::public.program_session_kind
    else 'talk'::public.program_session_kind
  end,
  submission.title,
  submission.abstract,
  submission.talk_level,
  case
    when submission.status = 'accepted' then 'confirmed'::public.program_session_status
    else 'draft'::public.program_session_status
  end,
  case
    when submission.workshop_duration_hours is not null then submission.workshop_duration_hours * 60
    else submission.scheduled_duration_minutes
  end,
  submission.workshop_max_participants,
  jsonb_build_object(
    'source',
    'cfp_backfill',
    'tags',
    coalesce((
      select jsonb_agg(tag.name order by tag.name)
      from public.cfp_submission_tags submission_tag
      join public.cfp_tags tag on tag.id = submission_tag.tag_id
      where submission_tag.submission_id = submission.id
    ), '[]'::jsonb)
  )
from public.cfp_submissions submission
where submission.status = 'accepted'
  or exists (
    select 1
    from public.program_schedule_items schedule_item
    where schedule_item.submission_id = submission.id
  )
  or exists (
    select 1
    from public.workshops workshop
    where workshop.cfp_submission_id = submission.id
  )
on conflict (cfp_submission_id) where cfp_submission_id is not null do nothing;

insert into public.program_session_speakers (session_id, speaker_id, role, sort_order)
select session.id, submission.speaker_id, 'speaker'::public.program_session_speaker_role, 0
from public.program_sessions session
join public.cfp_submissions submission on submission.id = session.cfp_submission_id
on conflict (session_id, speaker_id) do nothing;

insert into public.program_session_speakers (session_id, speaker_id, role, sort_order)
select
  session.id,
  participant.speaker_id,
  case
    when participant.role in ('host', 'mc', 'instructor') then participant.role::public.program_session_speaker_role
    when session.kind = 'workshop' then 'instructor'::public.program_session_speaker_role
    else 'panelist'::public.program_session_speaker_role
  end,
  10
from public.program_sessions session
join public.cfp_submission_speakers participant on participant.submission_id = session.cfp_submission_id
on conflict (session_id, speaker_id) do nothing;

update public.program_schedule_items schedule_item
set session_id = session.id
from public.program_sessions session
where schedule_item.session_id is null
  and schedule_item.submission_id = session.cfp_submission_id;

update public.workshops workshop
set session_id = session.id
from public.program_sessions session
where workshop.session_id is null
  and workshop.cfp_submission_id = session.cfp_submission_id;
