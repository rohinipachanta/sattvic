-- ─────────────────────────────────────────────
-- Sattvic — Schema Fix Migration
-- Run this in your Supabase SQL Editor:
--   supabase.com → your project → SQL Editor → New query → paste & run
-- ─────────────────────────────────────────────
-- This fixes 4 issues that caused "foreign key constraint" errors
-- when saving family members on the setup page.

-- ══════════════════════════════════════════════
-- FIX 1 (Critical): Add trigger to auto-create public.users row
-- ──────────────────────────────────────────────
-- When a user signs in for the first time, Supabase creates a row in
-- auth.users automatically. But our public.users table (which family_members
-- references via FK) needs a matching row. This trigger creates it automatically.

create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Also add an RLS INSERT policy so the app can upsert the users row directly
-- (needed for existing users who signed up before the trigger was added)
drop policy if exists "Users can insert own row" on users;
create policy "Users can insert own row"
  on users for insert with check (auth.uid() = id);


-- ══════════════════════════════════════════════
-- FIX 2: Widen activity_level CHECK constraint
-- ──────────────────────────────────────────────
-- Old schema only allowed: sedentary, moderate, active
-- App also sends: light, very_active

alter table family_members
  drop constraint if exists family_members_activity_level_check;

alter table family_members
  add constraint family_members_activity_level_check
  check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active'));


-- ══════════════════════════════════════════════
-- FIX 3: Widen dietary_preference CHECK constraint
-- ──────────────────────────────────────────────
-- Old schema only allowed: vegetarian, eggetarian, non_vegetarian
-- App also sends: vegan, jain

alter table family_members
  drop constraint if exists family_members_dietary_preference_check;

alter table family_members
  add constraint family_members_dietary_preference_check
  check (dietary_preference in ('vegetarian', 'vegan', 'eggetarian', 'non_vegetarian', 'jain'));


-- ══════════════════════════════════════════════
-- FIX 4: Add missing height_cm column
-- ──────────────────────────────────────────────
-- The app collects height but the original schema was missing this column.

alter table family_members
  add column if not exists height_cm numeric(5,1);


-- ══════════════════════════════════════════════
-- BONUS: Backfill existing auth users who have no public.users row
-- ──────────────────────────────────────────────
-- If you already have users who signed up before this fix, run this
-- to create their missing rows (so they don't get FK errors either).

insert into public.users (id, email)
select id, email from auth.users
on conflict (id) do nothing;
