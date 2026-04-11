do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'program_schedule_item_type'
  ) then
    create type public.program_schedule_item_type as enum (
      'session',
      'event',
      'break',
      'placeholder'
    );
  end if;
end
$$;

create table if not exists public.program_schedule_items (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  start_time time not null,
  duration_minutes integer not null check (duration_minutes > 0),
  room text null,
  type public.program_schedule_item_type not null,
  title text not null,
  description text null,
  submission_id uuid null references public.cfp_submissions(id) on delete set null,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_program_schedule_items_date on public.program_schedule_items(date);
create index if not exists idx_program_schedule_items_submission_id on public.program_schedule_items(submission_id) where submission_id is not null;
create index if not exists idx_program_schedule_items_visible on public.program_schedule_items(is_visible);

drop trigger if exists update_program_schedule_items_updated_at on public.program_schedule_items;
create trigger update_program_schedule_items_updated_at
before update on public.program_schedule_items
for each row
execute function public.update_updated_at_column();
