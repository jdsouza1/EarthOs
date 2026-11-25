# Monthly source audit

The GitHub Action (`.github/workflows/refresh.yml`, 2nd of each month) refreshes only the live feeds in
`data/indicators.csv`. Every other figure on the site is hand-researched and goes stale unless someone
checks its publisher for a newer edition. This file is the checklist for that check.

## Rules (they apply to every edit)

- Every number is labelled measured, modelled or expert and links its named source. Open the source; do not
  copy a figure from a search snippet alone unless two independent pages agree.
- Never average expert estimates. EarthOS publishes no survival percentage and runs no model of its own.
- A forecast or survey keeps its definition. A newer figure with a different definition goes in as a new row
  with its own label and year, never as a replacement.
- If the old edition is still the newest, leave it and say so in the report. Old is not the same as stale.
- Stay politically neutral. Describe outcomes; add no verdicts.

## Files to check (skip `indicators.csv`, `long_view*.csv`, `backtest*.csv`)

`expert_forecasts.csv` (refresh the Metaculus question 578 snapshot every month), `scenarios.csv`,
`whatif.csv`, `coming_due.csv`, `track_record.csv`, `funding.csv`, `funding_benchmarks.csv`,
`not_covered.csv`, `indicator_notes.csv`, `levers.csv`, `solved.csv`, `targets.csv`, `policy_impact.csv`,
`policy_steps.csv`, `policy_keynumbers.csv`, `policy_ratings.csv`, and the country tables
`policy_ai.csv`, `policy_food.csv`, `policy_health.csv`, `policy_nature.csv`, `policy_nuclear.csv`
(when a country table changes, `policy_gameplans.csv` quotes its scores and must change with it).

## When sources usually publish

| Month | Source |
| --- | --- |
| Jan | Doomsday Clock statement; Metaculus (every month) |
| Mar | UN IGME child mortality; IEA Global Methane Tracker |
| Apr | SIPRI military spending; Stanford AI Index; World Immunization Week release; Global Report on Food Crises |
| May | WMO Annual to Decadal Climate Update; IEA Global EV Outlook; World Bank carbon pricing |
| Jun | SIPRI Yearbook (nuclear forces); IEA World Energy Investment; FAS Status of World Nuclear Forces; GIRAI |
| Jul | UN SOFI hunger report; UN SDG Report; Tracking SDG7; WHO/UNICEF immunization coverage; IEA Coal Mid-Year Update |
| Sep | Planetary Health Check; AI Impacts survey (irregular) |
| Oct | UNEP Emissions Gap Report; Living Planet Report (even years); Global Hunger Index; IEA World Energy Outlook |
| Nov | Climate Action Tracker global update; COP outcome; Net Zero Stocktake; WHO measles report; UNEP Adaptation Gap; Stanford Global AI Vibrancy Tool (country selection for the AI page) |
| Dec | IEA Coal report; UNDP Human Development Report (2026 edition: 1 Dec); IMF fossil fuel subsidies (every two years) |
| Irregular | Forecasting Research Institute panel waves; Climate Action Tracker country ratings; NTI Index; EPI; plastics treaty talks; WHO Pandemic Agreement; ozone assessment (every four years, 2026 edition pending); UN World Population Prospects (next: 2027) |

## Mechanics

- `policy_impact.csv` and `whatif.csv` use Windows line endings; keep them. Never leave an unquoted comma
  in a field: the build refuses the row.
- Set `checked` or `retrieved` to today on every row you verify and change.
- Also update `lib/methodology.ts` if a `fixedSources` link names an old edition.
- Add one `data/changelog.csv` row (type `data`) listing what changed and what was checked and left alone.
- `npm ci && npm run build` must pass. Work on a branch; the Vercel preview is the second check.
