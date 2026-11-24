-- Earth OS — seed with the v1 prototype values.
-- Every row is is_illustrative = true: these are placeholders, not real estimates.
-- Run AFTER 0001_init.sql. Safe to re-run.

insert into public.tiers (id, name, status, chart_type, sort_order) values
  ('existential', 'Existential Survival', 'Degrading',   'line', 1),
  ('systemic',    'Systemic Health',      'Stagnant',    'bar',  2),
  ('tech',        'Clean Tech & Access',      'High Risk',   'line', 3),
  ('flourishing', 'Human Flourishing',    'Sub-Optimal', 'bar',  4)
on conflict (id) do update set name = excluded.name, status = excluded.status,
  chart_type = excluded.chart_type, sort_order = excluded.sort_order;

insert into public.tier_scores (tier_id, observed_at, score, source) values
  ('existential','2026-01-01',72,'prototype'),('existential','2026-02-01',71,'prototype'),('existential','2026-03-01',69,'prototype'),
  ('existential','2026-04-01',66,'prototype'),('existential','2026-05-01',64,'prototype'),('existential','2026-06-01',62,'prototype'),
  ('systemic','2026-01-01',42,'prototype'),('systemic','2026-02-01',43,'prototype'),('systemic','2026-03-01',43,'prototype'),
  ('systemic','2026-04-01',44,'prototype'),('systemic','2026-05-01',45,'prototype'),('systemic','2026-06-01',45,'prototype'),
  ('tech','2026-01-01',22,'prototype'),('tech','2026-02-01',24,'prototype'),('tech','2026-03-01',26,'prototype'),
  ('tech','2026-04-01',29,'prototype'),('tech','2026-05-01',31,'prototype'),('tech','2026-06-01',32,'prototype'),
  ('flourishing','2026-01-01',61,'prototype'),('flourishing','2026-02-01',60,'prototype'),('flourishing','2026-03-01',59,'prototype'),
  ('flourishing','2026-04-01',58,'prototype'),('flourishing','2026-05-01',58,'prototype'),('flourishing','2026-06-01',58,'prototype')
on conflict (tier_id, observed_at) do update set score = excluded.score;

insert into public.headline_metrics (key, value, trend_10y, model_version, source) values
  ('survival_probability',  68.4, null, 'v4.2 (placeholder)', 'prototype'),
  ('planetary_unity_index', 42.1, -2.4, null,                 'prototype')
on conflict (key) do update set value = excluded.value, trend_10y = excluded.trend_10y,
  model_version = excluded.model_version, updated_at = now();

insert into public.survival_trend (year, probability, kind, model_version) values
  (1990,88.5,'historical',null),(2000,84.2,'historical',null),(2010,79.0,'historical',null),
  (2020,71.5,'historical',null),(2026,68.4,'historical',null),
  (2030,62.1,'projected','v4.2'),(2040,55.4,'projected','v4.2'),(2050,48.9,'projected','v4.2')
on conflict (year) do update set probability = excluded.probability, kind = excluded.kind;

insert into public.risk_factors (name, tier_id, impact_pct, severity) values
  ('AGI Alignment Failure',                 'tech',        -14.2, 'CRITICAL'),
  ('Nuclear Proliferation',                 'existential',  -8.7, 'ELEVATED'),
  ('Resource Scarcity (Water/Arable Land)', 'systemic',     -5.1, 'WARNING')
on conflict (name) do update set impact_pct = excluded.impact_pct, severity = excluded.severity;
