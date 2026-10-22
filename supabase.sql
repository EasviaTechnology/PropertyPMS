-- Run in your own Supabase project's SQL Editor.
-- Clients must only use a public anon/publishable key. Never embed a service-role key in a website.
create table if not exists public.workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.workspaces enable row level security;

drop policy if exists "Workspace owner select" on public.workspaces;
create policy "Workspace owner select" on public.workspaces
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Workspace owner insert" on public.workspaces;
create policy "Workspace owner insert" on public.workspaces
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Workspace owner update" on public.workspaces;
create policy "Workspace owner update" on public.workspaces
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Workspace owner delete" on public.workspaces;
create policy "Workspace owner delete" on public.workspaces
  for delete to authenticated using ((select auth.uid()) = user_id);
