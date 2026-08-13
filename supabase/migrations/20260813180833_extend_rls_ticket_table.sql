begin;

alter table public.tickets enable row level security;

revoke all on table public.tickets from anon;
grant select, insert, update, delete on table public.tickets to authenticated;
grant all on table public.tickets to service_role;

do $$
declare
p record;
begin
for p in
select policyname
from pg_policies
where schemaname = 'public'
  and tablename = 'tickets'
    loop
    execute format('drop policy %I on public.tickets', p.policyname);
end loop;
end
$$;

create policy "tickets_authenticated_full_access"
on public.tickets
for all
to authenticated
using (true)
with check (true);

commit;

select 'ok' as status;