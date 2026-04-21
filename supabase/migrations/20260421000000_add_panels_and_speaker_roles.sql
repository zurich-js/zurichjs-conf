alter type public.cfp_submission_type add value if not exists 'panel';

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'cfp_speaker_role'
  ) then
    create type public.cfp_speaker_role as enum (
      'speaker',
      'mc'
    );
  end if;
end
$$;

alter table public.cfp_speakers
add column if not exists speaker_role public.cfp_speaker_role not null default 'speaker';

create table if not exists public.cfp_submission_speakers (
  submission_id uuid not null references public.cfp_submissions(id) on delete cascade,
  speaker_id uuid not null references public.cfp_speakers(id) on delete cascade,
  role text not null default 'panelist',
  created_at timestamptz not null default now(),
  primary key (submission_id, speaker_id)
);

create index if not exists idx_cfp_submission_speakers_speaker_id
on public.cfp_submission_speakers(speaker_id);
