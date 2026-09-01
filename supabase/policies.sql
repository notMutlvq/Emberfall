-- Emberfall — Row Level Security. Run AFTER schema.sql.
-- RLS is default-deny: with it enabled and no matching policy, a query
-- returns nothing / errors. A table with RLS OFF is world-readable AND
-- world-writable through the anon key, so every table below enables it.

-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles      enable row level security;
alter table public.runs          enable row level security;
alter table public.player_state  enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────
-- Readable by everyone (usernames show on the leaderboard and the sign-up
-- screen checks availability before calling auth). Writable only by the
-- owner; the row itself is created by the on_auth_user_created trigger.
drop policy if exists profiles_select_all on public.profiles;
create policy profiles_select_all
  on public.profiles for select
  to anon, authenticated
  using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No INSERT policy: profiles are created by the SECURITY DEFINER trigger,
-- not the client. No DELETE policy: rows cascade when the auth user is
-- deleted.

-- ── runs ─────────────────────────────────────────────────────────────────
-- SELECT is public — it is the leaderboard.
-- There is deliberately NO insert/update/delete policy: runs are written
-- only by the stage-4 edge function using the service-role key, which
-- bypasses RLS. This is what keeps "post your own score" off the client.
drop policy if exists runs_select_all on public.runs;
create policy runs_select_all
  on public.runs for select
  to anon, authenticated
  using (true);

-- ── player_state ─────────────────────────────────────────────────────────
-- Full access, owner only.
drop policy if exists player_state_all_own on public.player_state;
create policy player_state_all_own
  on public.player_state for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
