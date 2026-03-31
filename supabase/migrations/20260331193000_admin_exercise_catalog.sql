create table if not exists public.admin_users (
    user_id uuid primary key references auth.users(id) on delete cascade,
    email text,
    created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "users can read own admin row" on public.admin_users;
create policy "users can read own admin row"
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.claim_initial_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid;
    current_user_email text;
begin
    current_user_id := auth.uid();
    current_user_email := auth.jwt() ->> 'email';

    if current_user_id is null then
        return false;
    end if;

    if exists (
        select 1
        from public.admin_users
        where user_id = current_user_id
    ) then
        return true;
    end if;

    if exists (
        select 1
        from public.admin_users
    ) then
        return false;
    end if;

    insert into public.admin_users (user_id, email)
    values (current_user_id, current_user_email)
    on conflict (user_id) do nothing;

    return true;
end;
$$;

revoke all on function public.claim_initial_admin() from public;
grant execute on function public.claim_initial_admin() to authenticated;

drop policy if exists "admins can read full exercise catalog" on public.exercise_catalog;
create policy "admins can read full exercise catalog"
on public.exercise_catalog
for select
to authenticated
using (
    exists (
        select 1
        from public.admin_users
        where user_id = (select auth.uid())
    )
);

drop policy if exists "admins can insert exercise catalog" on public.exercise_catalog;
create policy "admins can insert exercise catalog"
on public.exercise_catalog
for insert
to authenticated
with check (
    exists (
        select 1
        from public.admin_users
        where user_id = (select auth.uid())
    )
);

drop policy if exists "admins can update exercise catalog" on public.exercise_catalog;
create policy "admins can update exercise catalog"
on public.exercise_catalog
for update
to authenticated
using (
    exists (
        select 1
        from public.admin_users
        where user_id = (select auth.uid())
    )
)
with check (
    exists (
        select 1
        from public.admin_users
        where user_id = (select auth.uid())
    )
);

drop policy if exists "admins can delete exercise catalog" on public.exercise_catalog;
create policy "admins can delete exercise catalog"
on public.exercise_catalog
for delete
to authenticated
using (
    exists (
        select 1
        from public.admin_users
        where user_id = (select auth.uid())
    )
);
