create table if not exists public.user_snapshots (
    user_id uuid primary key references auth.users(id) on delete cascade,
    schema_version int not null default 1,
    snapshot jsonb not null,
    updated_at timestamptz not null default now()
);

alter table public.user_snapshots enable row level security;

drop policy if exists "users can read own snapshot" on public.user_snapshots;
create policy "users can read own snapshot"
on public.user_snapshots
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "users can insert own snapshot" on public.user_snapshots;
create policy "users can insert own snapshot"
on public.user_snapshots
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "users can update own snapshot" on public.user_snapshots;
create policy "users can update own snapshot"
on public.user_snapshots
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "users can delete own snapshot" on public.user_snapshots;
create policy "users can delete own snapshot"
on public.user_snapshots
for delete
to authenticated
using ((select auth.uid()) = user_id);

create table if not exists public.exercise_catalog (
    id text primary key,
    definition jsonb not null,
    sort_order int not null default 0,
    is_active boolean not null default true,
    updated_at timestamptz not null default now()
);

alter table public.exercise_catalog enable row level security;

drop policy if exists "catalog is readable by everyone" on public.exercise_catalog;
create policy "catalog is readable by everyone"
on public.exercise_catalog
for select
to anon, authenticated
using (is_active = true);
