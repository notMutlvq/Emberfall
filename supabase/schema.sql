-- Emberfall — database schema
-- Run this once in the Supabase SQL editor (or `supabase db push`), then
-- run policies.sql. Stage 2 only uses `profiles`; `runs` and `player_state`
-- are created here too so later stages need no schema migration.

create extension if not exists citext;

-- ─────────────────────────────────────────────────────────────────────────
-- profiles — one row per account, created automatically on sign-up
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   citext not null unique
             check (username = lower(username) and username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

comment on table public.profiles is
  'Public account handles. username is lowercase, citext so uniqueness is case-insensitive.';

-- Sign-up carries the chosen username in auth user metadata; this trigger
-- turns it into a profile row inside the same transaction, so a duplicate
-- username makes the whole sign-up fail (which is what we want).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- runs — one row per finished run. Populated by the stage-4 edge function
-- (service role), never by the client. Public-readable: it's the leaderboard.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.runs (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  class         text not null check (class in ('warrior', 'ranger', 'mage')),
  level         int  not null check (level >= 1),
  kills         int  not null check (kills >= 0),
  elites        int  not null check (elites >= 0),
  bosses        int  not null check (bosses >= 0),
  zones_cleared int  not null check (zones_cleared between 0 and 5),
  deepest_zone  int  not null check (deepest_zone between 0 and 4),
  gold          int  not null check (gold >= 0),
  duration_ms   bigint not null check (duration_ms >= 0),
  score         int  not null check (score >= 0),
  flagged       boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists runs_score_desc_idx on public.runs (score desc);
create index if not exists runs_user_score_idx  on public.runs (user_id, score desc);
create index if not exists runs_class_score_idx on public.runs (class, score desc);

-- ─────────────────────────────────────────────────────────────────────────
-- player_state — the stash that persists between runs, plus meta counters.
-- Fully private to the owner. Used from stage 3.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.player_state (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  stash       jsonb not null default '[]'::jsonb,
  best_score  int not null default 0,
  total_runs  int not null default 0,
  updated_at  timestamptz not null default now()
);
