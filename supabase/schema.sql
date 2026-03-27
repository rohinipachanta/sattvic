-- ─────────────────────────────────────────────
-- Sattvic — Supabase Database Schema
-- Run this in Supabase SQL Editor to set up all tables
-- ─────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ── USERS ─────────────────────────────────────
-- Stores each Google-authenticated user and their location
create table if not exists users (
  id                  uuid primary key default uuid_generate_v4(),
  email               text not null unique,
  google_id           text unique,
  created_at          timestamptz default now(),
  location_zip        text,
  location_lat        double precision,
  location_lng        double precision,
  location_city       text,
  location_country    text,
  location_timezone   text                          -- e.g. "Asia/Kolkata"
);

-- ── FAMILY MEMBERS ────────────────────────────
-- Each user can have multiple family members with individual health profiles
create table if not exists family_members (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references users(id) on delete cascade,
  name                text not null,
  date_of_birth       date not null,
  gender              text not null check (gender in ('male','female','other')),
  weight_kg           numeric(5,2),                 -- nullable — optional
  dosha               text check (dosha in (
                        'vata','pitta','kapha',
                        'vata_pitta','pitta_kapha','vata_kapha'
                      )),
  activity_level      text not null default 'moderate'
                        check (activity_level in ('sedentary','moderate','active')),
  dietary_preference  text not null default 'vegetarian'
                        check (dietary_preference in ('vegetarian','eggetarian','non_vegetarian')),
  health_conditions   text[] not null default '{}',  -- e.g. ["diabetes_type2","anaemia"]
  health_goals        text[] not null default '{}',  -- e.g. ["weight_loss","gut_health"]
  cuisine_preferences text[] not null default '{}',  -- e.g. ["south_indian","mediterranean"]
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger family_members_updated_at
  before update on family_members
  for each row execute function update_updated_at();

-- ── FASTING PREFERENCES ───────────────────────
-- Per-user fasting calendar settings
create table if not exists fasting_preferences (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null unique references users(id) on delete cascade,
  fasting_types       text[] not null default '{"ekadashi"}',
  strictness_level    text not null default 'standard'
                        check (strictness_level in ('standard','phalahar','dairy_only'))
);

-- ── MEAL PLANS ────────────────────────────────
-- One row per week per user — stores the full AI-generated plan as JSON
create table if not exists meal_plans (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references users(id) on delete cascade,
  week_start_date     date not null,               -- always a Monday
  generated_at        timestamptz default now(),
  plan_data           jsonb not null,              -- full 7-day plan (DayPlan[])
  unique (user_id, week_start_date)               -- one plan per week per user
);

-- Index for fast lookups of a user's plan by week
create index if not exists idx_meal_plans_user_week
  on meal_plans (user_id, week_start_date desc);

-- ── ROW LEVEL SECURITY ────────────────────────
-- Users can only read and write their own data

alter table users              enable row level security;
alter table family_members     enable row level security;
alter table fasting_preferences enable row level security;
alter table meal_plans         enable row level security;

-- Users table policies
create policy "Users can read own row"
  on users for select using (auth.uid() = id);
create policy "Users can update own row"
  on users for update using (auth.uid() = id);

-- Family members policies
create policy "Users can read own family members"
  on family_members for select using (auth.uid() = user_id);
create policy "Users can insert own family members"
  on family_members for insert with check (auth.uid() = user_id);
create policy "Users can update own family members"
  on family_members for update using (auth.uid() = user_id);
create policy "Users can delete own family members"
  on family_members for delete using (auth.uid() = user_id);

-- Fasting preferences policies
create policy "Users can read own fasting prefs"
  on fasting_preferences for select using (auth.uid() = user_id);
create policy "Users can upsert own fasting prefs"
  on fasting_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update own fasting prefs"
  on fasting_preferences for update using (auth.uid() = user_id);

-- Meal plans policies
create policy "Users can read own meal plans"
  on meal_plans for select using (auth.uid() = user_id);
create policy "Users can insert own meal plans"
  on meal_plans for insert with check (auth.uid() = user_id);
create policy "Users can update own meal plans"
  on meal_plans for update using (auth.uid() = user_id);
create policy "Users can delete own meal plans"
  on meal_plans for delete using (auth.uid() = user_id);
