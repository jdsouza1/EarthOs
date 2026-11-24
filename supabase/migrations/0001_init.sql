-- Earth OS — initial schema
-- Run in Supabase: Dashboard > SQL Editor > New query > paste > Run.

-- ── Tiers (the four pillars) ────────────────────────────────────────────
create table if not exists public.tiers (
  id          text primary key check (id in ('existential','systemic','tech','flourishing')),
  name        text not null,
  status      text not null default 'Unknown',
  chart_type  text not null default 'line' check (chart_type in ('line','bar')),
  sort_order  int  not null
);

-- ── Tier score time series (one row per tier per observation) ─────────
create table if not exists public.tier_scores (
  id              bigint generated always as identity primary key,
  tier_id         text not null references public.tiers(id) on delete cascade,
  observed_at     date not null,
  score           numeric(5,2) not null check (score between 0 and 100),
  source          text,                          -- which pipeline / dataset produced it
  is_illustrative boolean not null default true, -- flip to false only for real pipeline output
  created_at      timestamptz not null default now(),
  unique (tier_id, observed_at)
);
create index if not exists tier_scores_tier_date_idx on public.tier_scores (tier_id, observed_at desc);

-- ── Headline numbers (survival %, unity index, …) ─────────────────────
create table if not exists public.headline_metrics (
  key             text primary key,               -- e.g. 'survival_probability'
  value           numeric not null,
  trend_10y       numeric,
  model_version   text,
  source          text,
  is_illustrative boolean not null default true,
  updated_at      timestamptz not null default now()
);

-- ── Survival probability trend (historical + projected) ───────────────
create table if not exists public.survival_trend (
  year            int primary key,
  probability     numeric(5,2) not null check (probability between 0 and 100),
  kind            text not null check (kind in ('historical','projected')),
  model_version   text,
  is_illustrative boolean not null default true
);

-- ── Risk factors ──────────────────────────────────────────────────────
do $$ begin
  create type public.risk_severity as enum ('CRITICAL','ELEVATED','WARNING');
exception when duplicate_object then null; end $$;

create table if not exists public.risk_factors (
  id              bigint generated always as identity primary key,
  name            text not null unique,
  tier_id         text references public.tiers(id),
  impact_pct      numeric(5,2) not null,          -- negative = drag on survival %
  severity        public.risk_severity not null,
  active          boolean not null default true,
  is_illustrative boolean not null default true,
  updated_at      timestamptz not null default now()
);

-- ── Row Level Security: public can READ, nobody can write via the API ──
-- The Python pipeline writes with the service_role key, which bypasses RLS.
alter table public.tiers            enable row level security;
alter table public.tier_scores      enable row level security;
alter table public.headline_metrics enable row level security;
alter table public.survival_trend   enable row level security;
alter table public.risk_factors     enable row level security;

create policy "public read tiers"            on public.tiers            for select to anon, authenticated using (true);
create policy "public read tier_scores"      on public.tier_scores      for select to anon, authenticated using (true);
create policy "public read headline_metrics" on public.headline_metrics for select to anon, authenticated using (true);
create policy "public read survival_trend"   on public.survival_trend   for select to anon, authenticated using (true);
create policy "public read risk_factors"     on public.risk_factors     for select to anon, authenticated using (true);
