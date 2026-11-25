# Use this format for your city, county, state or country

EarthOS tracks the whole world, but the format works at any level. The code is under the MIT licence
(see `LICENSE`), so you may copy it, change it and publish your own version without asking. This guide
is for someone who wants to do that: a city analyst, a student, a journalist, a community group.

## The idea in one loop

1. **Collect data.** Pick the numbers that show how your place is doing.
2. **Build the dashboard.** Put them on one page, each with its source.
3. **Analyse.** Show which numbers are furthest from their targets and which are moving the wrong way.
4. **Gather the plans.** List what named sources say would move each number, and who can act.
5. **Track the promises.** Record what leaders have publicly committed to, beside the measured number.
6. **Refresh and repeat.** Update on a fixed day each month and log every change.

EarthOS does steps 1 to 6 for the world. It does not do the human part: getting people in a room,
agreeing priorities and following through. At city or county level that part is possible, which is
why a local version can go further than the global one.

## Rules worth keeping

These are what make people trust the page whatever their politics.

- Every number links to a named source that anyone can open.
- Every number is labelled measured, modelled or expert judgement.
- Show what sources say; add no verdicts of your own. When experts disagree, show the range, never an average.
- Use official targets that someone else set (a council plan, a state law, a national goal), not your own.
- Log every change publicly. A wrong number should stop the build, not go live.

## What to change, file by file

Everything on the site comes from CSV files in `data/`. You can edit them in any spreadsheet app.

| File | What it holds | What you do |
| --- | --- | --- |
| `data/indicators.csv` | Every measured value: `indicator_id, tier_id, name, observed_at, value, unit, source, source_url, retrieved_at, is_illustrative` | Replace the rows with your own 10 to 20 indicators. Several years of history each, one row per date |
| `data/tiers.csv` | The four areas indicators are grouped into | Rename the areas and rewrite their descriptions. Keep the four ids as they are (`existential`, `systemic`, `tech`, `flourishing`): they are fixed in the code. Renaming an id means editing `lib/types.ts` too |
| `data/indicator_info.csv` | One plain sentence explaining each indicator | Write one per indicator |
| `data/targets.csv` | The official target for each indicator, who set it, and the deadline | Fill in local targets. Use `direction` where no official number exists |
| `data/levers.csv` | Who can act on each indicator, with evidence | Name the real local decision-makers: council, agency, utility, school board |
| `data/promises.csv` | Public commitments, with deadline and the measured number | List what your leaders have promised: a climate plan, a housing goal, a road-safety target |
| `data/funding.csv` | What is spent and what is needed, for a few areas | Optional. Use budget documents; leave it out if you lack a sourced "needed" figure |
| `data/solved.csv` | Problems already solved, and how | Optional. Local wins are powerful: a cleaned-up river, a fall in road deaths |
| `data/changelog.csv` | Every change to data or site | Start a fresh one |

Pages you can drop for a local version: Policies (country ratings), Forecasts (global risk estimates),
What if (global scenarios) and Not covered yet. Delete the folder under `app/`, its data files, its
entry in `lib/methodology.ts` and its line in `lib/nav.ts`. Run `npm run build` after each removal;
the build tells you what still points at the deleted file.

## Where local data usually lives

- The national statistics office or census, which often publishes down to city or county level
- Your city, county or state open-data portal
- Health departments (deaths, vaccination, hospital data) and school boards (attendance, graduation)
- Utilities and regulators (water quality, power cuts, air-quality monitors)
- Police and transport agencies (crime, road deaths, transit use)
- Budget documents and council minutes, for spending and for promises

Prefer sources that publish on a schedule and keep history. A number you can only get once is not an indicator.

## Getting the numbers in

- **By hand:** type rows into `data/indicators.csv`. Fine for annual figures.
- **Automatically:** add a `Source(...)` entry in `scripts/ingest.py` for any source with a stable download
  link. The monthly GitHub Action (`.github/workflows/refresh.yml`) then fetches it, checks it and
  redeploys the site. The README explains the checks.
- For figures researched by hand, follow `docs/source-audit.md` once a month so they do not go stale.

## Running and publishing it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # the full check: fails if any data file breaks a rule
```

Hosting is free on Vercel: import your copy of the repo at https://vercel.com/new. There are no
accounts, no database and no environment variables.

Change the site name in `app/layout.tsx`, `components/site/SiteNav.tsx` and `components/site/SiteFooter.tsx`.

## Then the part software cannot do

A dashboard changes nothing by itself. What has worked for problems that were actually solved
(see the Solved page) is a narrow problem, a measurable target, a small group that acts first, and
someone checking who kept their word. Locally that means:

1. Show the dashboard to the people who own the numbers, and ask what is wrong with it. Fix what they find.
2. Pick one or two indicators, not twenty.
3. Get a public commitment with a number and a date, and add it to `data/promises.csv`.
4. Report on it every month, whoever is embarrassed.

## Credit and data rights

The code is MIT-licensed. The figures belong to whoever publishes them and keep their own terms of
use. A link back to https://github.com/jdsouza1/EarthOs is appreciated but not required. If you build
a local version, open an issue on that repo to say so: a list of them would help the next person.
