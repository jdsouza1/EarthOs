# EarthOS: Humanity's vital signs

A free, open dashboard of how humanity is doing, built from measured indicators with every number linked to its source.

**Live site:** https://earth-os-blond.vercel.app

## What's on the site

| Page | What it shows |
|---|---|
| Dashboard | Four area scores (0 to 100) built from 20 measured indicators, the weakest points, and what is moving the wrong way |
| Levers | Who can act on each weak spot, with sources |
| Policies | Country ratings and game plans for climate, nuclear weapons, AI governance, nature, food and health |
| Forecasts | The range of published expert estimates |
| What if | Scenarios from published models, for example warming if countries keep their climate promises |
| Solved | Global problems humanity has already beaten or pushed back, and why |
| Brief | A short monthly read on the latest numbers |
| Methodology | How every score is calculated, and the list of every data file |
| Change log | Every change to the data or the site |

## Principles

- **Every number is sourced.** Each data row carries a source name and link.
- **Every number is labelled** as measured, modelled or expert judgement.
- **No doom score.** EarthOS publishes no survival probability of its own.
- **Expert estimates are never averaged.** The site shows the lowest and highest published figures.
- **A wrong number cannot go live.** The loaders check every file, and a broken row stops the build.

## Run it locally

You need Node.js 20 or newer.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # full check: fails if any data file breaks a rule
```

There are no environment variables, no database and no accounts.

## How the project is laid out

| Folder | What it holds |
|---|---|
| `app/` | Pages (Next.js App Router, statically generated) |
| `components/` | Page sections and charts |
| `lib/` | Data loaders, scoring, design tokens. `lib/methodology.ts` lists every data file |
| `data/` | All content as CSV files. Edit in any spreadsheet app and save as UTF-8 CSV |
| `scripts/` | Python scripts that download the indicators and sync design tokens |
| `supabase/` | An unused schema, kept for a possible later move to a database |

**Adding a data file:** add the CSV to `data/`, write its loader in `lib/`, and register it in `lib/methodology.ts`. An unregistered file stops the build.

## Data ingestion

`scripts/ingest.py` downloads raw indicators into `data/indicators.csv`: values as published, with units and sources, never scores. Standard-library Python only.

```bash
python scripts/ingest.py --dry-run     # download and check everything, write nothing
python scripts/ingest.py               # update data/indicators.csv (and log changes)
python scripts/ingest.py --only co2    # one source
python scripts/ingest.py --list        # show sources
```

| Key | Indicator | Unit | Source |
|---|---|---|---|
| `co2` | Atmospheric CO2, Mauna Loa monthly | ppm | [NOAA GML](https://gml.noaa.gov/ccgg/trends/) |
| `ch4` | Methane, global monthly | ppb | [NOAA GML](https://gml.noaa.gov/ccgg/trends_ch4/) |
| `n2o` | Nitrous oxide, global monthly | ppb | [NOAA GML](https://gml.noaa.gov/ccgg/trends_n2o/) |
| `temp` | Global surface temperature anomaly vs 1951–1980 | °C | [NASA GISTEMP v4](https://data.giss.nasa.gov/gistemp/) |
| `warheads` | Nuclear warhead stockpiles, world | warheads | [FAS via Our World in Data](https://ourworldindata.org/grapher/nuclear-warhead-stockpiles-lines) |
| `poverty` | Share in extreme poverty, world | % | [World Bank PIP via Our World in Data](https://ourworldindata.org/grapher/share-of-population-in-extreme-poverty) |
| `hunger` | Share undernourished, world | % | [FAO via Our World in Data](https://ourworldindata.org/grapher/prevalence-of-undernourishment) |
| `conflict` | Deaths in state-based conflicts, world | deaths | [UCDP/PRIO via Our World in Data](https://ourworldindata.org/grapher/deaths-in-state-based-conflicts-by-world-region) |
| `internet` | Share using the internet, world | % | [ITU via Our World in Data](https://ourworldindata.org/grapher/share-of-individuals-using-the-internet) |
| `lowcarbon` | Low-carbon share of electricity, world | % | [Ember / Energy Institute via Our World in Data](https://ourworldindata.org/grapher/share-electricity-low-carbon) |
| `solarpv` | Solar PV module price | US$/W | [IRENA et al. via Our World in Data](https://ourworldindata.org/grapher/solar-pv-prices) |
| `genai` | Private investment in generative AI | US$ 2021 | [Quid via Stanford AI Index via Our World in Data](https://ourworldindata.org/grapher/global-investment-in-generative-ai) |
| `lifeexp` | Life expectancy at birth, world | years | [UN WPP / HMD via Our World in Data](https://ourworldindata.org/grapher/life-expectancy) |
| `childmort` | Child mortality under 5, world | % of births | [UN IGME / Gapminder via Our World in Data](https://ourworldindata.org/grapher/child-mortality) |
| `hdi` | Human Development Index, world | 0–1 | [UNDP via Our World in Data](https://ourworldindata.org/grapher/human-development-index) |
| `asteroids` | Near-Earth asteroids 140 m+ found | asteroids | [NASA CNEOS via Our World in Data](https://ourworldindata.org/grapher/near-earth-asteroids-discovered-over-time) |
| `lpi` | Living Planet Index | 1970 = 1 | [WWF/ZSL via Our World in Data](https://ourworldindata.org/grapher/global-living-planet-index) |
| `electricity` | Access to electricity, world | % | [World Bank via Our World in Data](https://ourworldindata.org/grapher/share-of-the-population-with-access-to-electricity) |
| `cooking` | Access to clean cooking, world | % | [WHO via Our World in Data](https://ourworldindata.org/grapher/access-to-clean-fuels-and-technologies-for-cooking) |
| `dtp3` | DTP3 vaccination coverage, world | % | [WHO/UNICEF via Our World in Data](https://ourworldindata.org/grapher/global-vaccination-coverage) |

Every source gets the same checks: enough rows, every value in a plausible range, no shrinking history, and a stop if the file format changes. A failing source is skipped and reported; the others still save. Every change is added to `data/changelog.csv` automatically.

**Adding a source:** add one `Source(...)` entry to `SOURCES` in `scripts/ingest.py`. Reuse a parser (`parse_noaa_gml`, `parse_gistemp`, `parse_owid_world`) or write a new one.

## Monthly data refresh

`.github/workflows/refresh.yml` runs `scripts/ingest.py` on GitHub on the 2nd of every month, and can be started by hand from the repo's **Actions** tab (**Monthly data refresh → Run workflow**).

1. Every source is downloaded and checked. A source that fails keeps its previous numbers.
2. The site is built with the new data. If any file breaks a rule, the run stops and nothing is saved.
3. The new data is committed to `main`, which triggers a fresh deploy.
4. If any source could not be reached, the run is marked as failed, so GitHub emails the owner.

Every full run, scheduled or by hand, adds a row to `data/refresh.csv`. The site shows the latest one as "Data checked" in the footer and on the Dashboard.

## Design tokens

All colours live in `lib/tokens.ts`. Components use them by name as Tailwind classes (`bg-surface`, `text-muted`, `border-line`, `text-critical`, `bg-accent-bg/40` …); charts read the same values directly.

- **Change a colour:** edit its value in `lib/tokens.ts`. Nothing else.
- **Add or rename a token:** edit `lib/tokens.ts`, then run `python scripts/sync_tokens.py` to update the name list in `app/globals.css`.
- **Shared styles** in `app/globals.css`: `panel` (section container), `card` (box inside a panel), `eyebrow` (small section heading), `tag` (monospace label).

## Deploying

The site is hosted on Vercel. Import the repo at https://vercel.com/new and deploy. No environment variables are needed.

## Data and credit

The figures belong to the organisations that publish them, including NOAA, NASA, the UN and its agencies, the World Bank, Our World in Data and the Federation of American Scientists. Each keeps its own terms of use, linked from the source on every row. EarthOS adds the selection, the scoring method and the presentation.

## Contributing

Corrections and ideas are welcome. Open an issue, and for any change to a number include a link to the source.
