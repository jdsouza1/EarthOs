import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const DATA_DIR = path.join(process.cwd(), 'data');

export type DatasetStatus = 'real' | 'illustrative' | 'mixed' | 'missing' | 'retired';

export interface DatasetInfo {
  group: 'Dashboard' | 'Policies' | 'Forecasts' | 'Funding' | 'Site';
  file: string;
  title: string;
  feeds: string;
  method: string;
  status: DatasetStatus;
  rows: number;
  illustrativeRows: number;
  sources: { name: string; url?: string }[];
}

export const DATASET_GROUPS = ['Dashboard', 'Policies', 'Forecasts', 'Funding', 'Site'] as const;
export type DatasetGroup = (typeof DATASET_GROUPS)[number];

type RegistryEntry = Omit<DatasetInfo, 'status' | 'rows' | 'illustrativeRows' | 'sources'> & {
  group: DatasetGroup;
  /** For files whose rows carry no source column: the sources the page that uses them names. */
  fixedSources?: { name: string; url?: string }[];
};

/**
 * What each data file is and how it's used. The page reads the files themselves for
 * row counts, illustrative flags and sources, so those can never drift from the data.
 * Every file in data/ must be listed here, or the build fails (see getMethodologyData).
 */
const REGISTRY: RegistryEntry[] = [
  {
    group: 'Dashboard',
    file: 'indicators.csv',
    title: 'Raw indicators',
    feeds: 'The Measured indicators on the Dashboard. Also the input to every area score, Weakest points and Moving the wrong way.',
    method: 'Downloaded by scripts/ingest.py from the named source. Values are stored as published, with units. The script refuses to write a source whose download is truncated, out of range, in a changed format or would shrink the history.',
  },
  {
    group: 'Dashboard',
    file: 'targets.csv',
    title: 'Indicator targets',
    feeds: 'The target line and progress bar on each indicator card. Also sets how each indicator is scored.',
    method: 'Official targets only, each with the body that set it (World Bank, UN SDGs, Paris Agreement, TPNW). Reach targets show progress from a stated baseline year; limits show the current level against the limit; indicators without an official target show only which direction is better. No target is invented.',
  },
  {
    group: 'Dashboard',
    file: 'indicator_info.csv',
    title: 'What each indicator measures',
    feeds: 'The plain-English note behind the ⓘ on each indicator card and in Weakest points.',
    method: 'Written by hand from the source’s own definition.',
  },
  {
    group: 'Dashboard',
    file: 'indicator_notes.csv',
    title: 'Notes on indicator cards',
    feeds: 'The sourced note on some indicator cards, such as a newer published figure the data feed has not picked up yet.',
    method: 'Written by hand from the named source. A note with an until_year disappears once the data reaches that year.',
    fixedSources: [
      { name: 'FAO and partners (SOFI 2026)', url: 'https://www.fao.org/newsroom/detail/un-report--global-hunger-levels-ease-for-third-consecutive-year-as-regional-disparities-persist/en' },
      { name: 'Federation of American Scientists', url: 'https://fas.org/issues/nuclear-weapons/status-world-nuclear-forces/' },
    ],
  },
  {
    group: 'Dashboard',
    file: 'tiers.csv',
    title: 'Area labels',
    feeds: 'Names, chart style and display order for the four areas. The status label (Improving, Stagnant, Degrading) is computed from the 5-year score change.',
    method: 'Configuration, not measured data.',
  },
  {
    group: 'Dashboard',
    file: 'levers.csv',
    title: 'Levers',
    feeds: 'The Levers page.',
    method: 'Each lever names who can act and a source: an agreed international target or published evidence. Rows without a source fail the build.',
  },
  {
    group: 'Policies',
    file: 'policy_ratings.csv',
    title: 'Climate ratings',
    feeds: 'The Climate topic: each country’s overall, target and action rating.',
    method: 'Copied as published from the Climate Action Tracker country pages, with the date each was assessed.',
  },
  {
    group: 'Policies',
    file: 'emissions.csv',
    title: 'Emissions shares',
    feeds: 'The share-of-world-emissions bars on the Climate topic.',
    method: 'Each country’s greenhouse gas emissions divided by the world total, excluding land use, as published.',
  },
  {
    group: 'Policies',
    file: 'policy_nuclear.csv',
    title: 'Nuclear security scores and stockpiles',
    feeds: 'The Nuclear weapons topic.',
    method: 'Security scores, change and rank as published by NTI; stockpiles as estimated by SIPRI.',
    fixedSources: [
      { name: 'NTI Nuclear Security Index 2026', url: 'https://www.ntiindex.org/results/' },
      { name: 'SIPRI Yearbook 2026', url: 'https://www.sipri.org/yearbook/2026' },
    ],
  },
  {
    group: 'Policies',
    file: 'policy_nature.csv',
    title: 'Biodiversity scores',
    feeds: 'The Nature & biodiversity topic.',
    method: 'Biodiversity & Habitat scores, 10-year change and rank as published, for the megadiverse countries the index scores.',
    fixedSources: [{ name: 'Yale/Columbia Environmental Performance Index 2026', url: 'https://epi.yale.edu/2026/results/indicator/BDH' }],
  },
  {
    group: 'Policies',
    file: 'policy_food.csv',
    title: 'Hunger scores',
    feeds: 'The Food & hunger topic.',
    method: 'Scores, ranks and the four component measures as published, for the 15 countries with the highest scores.',
    fixedSources: [{ name: 'Global Hunger Index 2026', url: 'https://www.globalhungerindex.org/results/' }],
  },
  {
    group: 'Policies',
    file: 'policy_health.csv',
    title: 'Vaccination coverage',
    feeds: 'The Health & vaccination topic.',
    method: 'WHO/UNICEF coverage estimates for 2025 as published, for the 15 countries with the lowest third-dose DTP coverage.',
    fixedSources: [
      { name: 'WHO/UNICEF Estimates of National Immunization Coverage, 2025', url: 'https://www.unicef.org/press-releases/global-childhood-immunization-coverage-inches-forward-despite-conflict-and-hesitancy' },
      { name: 'WHO Global Health Observatory', url: 'https://ghoapi.azureedge.net/api/WHS4_100' },
    ],
  },
  {
    group: 'Policies',
    file: 'policy_ai.csv',
    title: 'Responsible AI scores',
    feeds: 'The AI governance topic.',
    method: 'Overall and dimension scores as published, for the leading AI countries the index assesses.',
    fixedSources: [
      { name: 'Global Index on Responsible AI 2026', url: 'https://www.global-index.ai/countries' },
      { name: 'Stanford HAI Global AI Vibrancy Tool (country selection)', url: 'https://hai.stanford.edu/ai-index/global-vibrancy-tool' },
    ],
  },
  {
    group: 'Policies',
    file: 'policy_keynumbers.csv',
    title: 'Key numbers',
    feeds: 'The key numbers beside each Policies topic.',
    method: 'Each number is taken from a sourced Impact line and keeps its source and confidence label. Rows without one fail the build.',
  },
  {
    group: 'Policies',
    file: 'policy_impact.csv',
    title: 'Impact lines',
    feeds: 'The Impact rows on each Policies topic.',
    method: 'Short summaries of published studies and named experts, each labelled measured, modelled or expert judgement. Rows without a source fail the build.',
  },
  {
    group: 'Policies',
    file: 'policy_master.csv',
    title: 'Gameplan steps',
    feeds: 'The step cards on each Policies topic.',
    method: 'The shared steps each country gameplan is built from. Their sources are on each step page.',
  },
  {
    group: 'Policies',
    file: 'policy_gameplans.csv',
    title: 'Country gameplans',
    feeds: 'Each country’s gameplan page.',
    method: 'Which shared steps apply to each country, from its published rating or score. Sources are on each step page.',
  },
  {
    group: 'Policies',
    file: 'policy_steps.csv',
    title: 'Step details',
    feeds: 'Each step page: what it means, how to do it and who needs to act.',
    method: 'Every line names its source and confidence label.',
  },
  {
    group: 'Forecasts',
    file: 'expert_forecasts.csv',
    title: 'Expert estimates',
    feeds: 'The Forecasts page and the expert range card on the Dashboard.',
    method: 'Published estimates as given, with each source’s own definition and date. Never averaged.',
  },
  {
    group: 'Forecasts',
    file: 'scenarios.csv',
    title: 'Long-range scenarios',
    feeds: 'The scenarios on the Forecasts page.',
    method: 'Published model scenarios as given, labelled modelled.',
  },
  {
    group: 'Forecasts',
    file: 'whatif.csv',
    title: 'What-if scenarios',
    feeds: 'The What if page.',
    method: 'Scenarios as published, labelled modelled. Each toggle switches only between scenarios from one source and one model; EarthOS computes nothing. The build fails if a toggle mixes sources or lacks one baseline.',
  },
  {
    group: 'Site',
    file: 'solved.csv',
    title: 'Problems solved before',
    feeds: 'The Solved page.',
    method: 'Past global problems as reported by named sources (WHO, UN, Our World in Data, FAS). The kind of cooperation follows Scott Barrett and is left blank where his examples were not checked.',
  },
  {
    group: 'Forecasts',
    file: 'backtest_p1.csv',
    title: 'Projection test, method 1',
    feeds: 'The Projections: tested, not published note on Forecasts.',
    method: 'EarthOS’s own test of method 1 against past years (scripts/project.py). Did not pass.',
  },
  {
    group: 'Forecasts',
    file: 'backtest.csv',
    title: 'Projection test, method 2',
    feeds: 'The Projections: tested, not published note on Forecasts.',
    method: 'EarthOS’s own test of method 2 against past years (scripts/project.py). Did not pass.',
  },
  {
    group: 'Forecasts',
    file: 'backtest_p3.csv',
    title: 'Projection test, method 3',
    feeds: 'The Projections: tested, not published note on Forecasts.',
    method: 'EarthOS’s own test of method 3 against past years (scripts/project_p3.py). Did not pass.',
  },
  {
    group: 'Forecasts',
    file: 'track_record.csv',
    title: 'Track record of past forecasts',
    feeds: 'The Track record page under Forecasts.',
    method: 'Hand-researched: each row is a published forecast whose date has passed, with its outcome from a separate named source. The verdict is set by a fixed rule, which the build re-checks.',
    fixedSources: [
      { name: 'IPCC', url: 'https://archive.ipcc.ch/' },
      { name: 'NASA GISTEMP', url: 'https://data.giss.nasa.gov/gistemp/' },
      { name: 'US National Academies', url: 'https://www.nationalacademies.org/read/9828/chapter/4' },
      { name: 'Arms Control Association', url: 'https://www.armscontrol.org/act/2013-06/jfks-american-university-speech-echoes-through-time' },
      { name: 'Federation of American Scientists', url: 'https://fas.org/issues/nuclear-weapons/status-world-nuclear-forces/' },
      { name: 'Our World in Data', url: 'https://ourworldindata.org/simon-ehrlich-bet' },
      { name: 'Forecasting Research Institute', url: 'https://forecastingresearch.substack.com/p/what-did-forecasters-get-right-and' },
      { name: 'Google DeepMind', url: 'https://deepmind.google/' },
      { name: 'International Energy Agency', url: 'https://prod.iea.org/reports/direct-air-capture' },
    ],
  },
  {
    group: 'Forecasts',
    file: 'coming_due.csv',
    title: 'Forecasts coming due',
    feeds: 'The Coming due list on the Track record page.',
    method: 'Hand-researched: published forecasts whose date has not passed, each linked to its source and, where EarthOS tracks the same thing, to the live indicator. When the date passes, a row moves to track_record.csv with its outcome.',
    fixedSources: [
      { name: 'World Meteorological Organization', url: 'https://wmo.int/news/media-centre/new-report-suggests-more-global-temperature-records-ahead' },
      { name: 'UN Sustainable Development Goals Report', url: 'https://unstats.un.org/sdgs/report/2026/goal-01/' },
      { name: 'FAO and partners (SOFI)', url: 'https://www.fao.org/newsroom/detail/un-report--global-hunger-levels-ease-for-third-consecutive-year-as-regional-disparities-persist/en' },
      { name: 'Tracking SDG7', url: 'https://www.seforall.org/system/files/2026-07/SEforALL%20Tracking%20SDG7%20-%20The%20Energy%20Progress%20Report%202026_22Jul2026.pdf' },
    ],
  },
  {
    group: 'Forecasts',
    file: 'history_tests.csv',
    title: 'Published tests of early-warning methods',
    feeds: 'The Deep time page under Forecasts.',
    method: 'Hand-researched: each row is a published method that claims to anticipate crises, with a published test of it. EarthOS runs no test of its own. The test label (real future, held-back data, or only the past) is checked by the build.',
    fixedSources: [
      { name: 'Turchin and Korotayev, PLOS ONE', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7430736' },
      { name: 'Goldstone and others, AJPS', url: 'https://dash.harvard.edu/entities/publication/73120378-c06b-6bd4-e053-0100007fdf3b' },
      { name: 'Bowlsby and others, BJPolS', url: 'https://www.hks.harvard.edu/publications/future-moving-target-predicting-political-instability' },
      { name: 'Herrington, Journal of Industrial Ecology', url: 'https://ui.adsabs.harvard.edu/abs/2021JInEc..25..614H' },
      { name: 'ViEWS competition, PRIO', url: 'https://www.prio.org/publications/13337' },
      { name: 'Scheffer and others, PNAS', url: 'https://par.nsf.gov/servlets/purl/10273077' },
      { name: 'Downey, Haas and Shennan, PNAS', url: 'https://discovery-pp.ucl.ac.uk/id/eprint/1535301/1/Shennan_European%20Neolithic%20societies%20showed%20early%20warning_.pdf' },
    ],
  },
  {
    group: 'Forecasts',
    file: 'long_view_series.csv',
    title: 'Long view: chart details',
    feeds: 'The Long view charts on the Deep time page.',
    method: 'Hand-written: title, unit, labels and sources for each long-view chart, and which live indicator it links to.',
    fixedSources: [
      { name: 'NOAA World Data Service for Paleoclimatology', url: 'https://www.ncei.noaa.gov/access/paleo-search/study/17975' },
      { name: 'PAGES 2k Consortium (2019)', url: 'https://www.ncei.noaa.gov/pub/data/paleo/pages2k/neukom2019temp/' },
      { name: 'Our World in Data, population sources', url: 'https://ourworldindata.org/population-sources' },
    ],
  },
  {
    group: 'Forecasts',
    file: 'long_view.csv',
    title: 'Long view: reconstructed history',
    feeds: 'The Long view charts on the Deep time page.',
    method: 'Downloaded once by scripts/long_view.py: the Antarctic ice-core CO2 composite (800,000 years), the PAGES 2k global temperature reconstruction (2,000 years, 31-year average and 95% range) with its thermometer record, and Our World in Data long-run world population (10,000 BCE to 2023). Each row is labelled measured or reconstructed. Fixed history, so outside the monthly refresh; the live Mauna Loa CO2 line comes from indicators.csv.',
    fixedSources: [
      { name: 'NOAA: Antarctic ice-core CO2 composite', url: 'https://www.ncei.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2composite-noaa.txt' },
      { name: 'NOAA: PAGES 2k temperature', url: 'https://www.ncei.noaa.gov/pub/data/paleo/pages2k/neukom2019temp/recons/Full_ensemble_median_and_95pct_range.txt' },
      { name: 'Our World in Data: population', url: 'https://ourworldindata.org/grapher/population' },
    ],
  },
  {
    group: 'Funding',
    file: 'funding.csv',
    title: 'Funding by area',
    feeds: 'The Funding page.',
    method: 'Hand-researched from each named source. Spent is the latest published figure; needed is a published model or a funder\u2019s own target, labelled as such. The gap is worked out by the build from the two figures (needed minus spent), or is the source\u2019s own "extra needed" figure; it is never typed in. Amounts are nominal US dollars as each source reports them; yearly and five-year figures are labelled and not converted. Areas cover different kinds of money (private investment, aid, one government\u2019s budget) and are never added together.',
    fixedSources: [
      { name: 'IEA', url: 'https://www.iea.org/reports/world-energy-investment-2026/regional-dashboards' },
      { name: 'Gavi, the Vaccine Alliance', url: 'https://www.gavi.org/news/document-library/05-resource-mobilisation-update-pdf' },
      { name: 'Ceres2030 via IFPRI', url: 'https://www.ifpri.org/blog/big-costs-bigger-rewards-how-33-billion-spending-each-year-can-help-end-hunger-sustainably-2030' },
      { name: 'UNEP State of Finance for Nature 2026 (IISD summary)', url: 'https://sdg.iisd.org/news/unep-report-calls-for-increase-in-nbs-investment-to-meet-global-goals/' },
      { name: 'The Planetary Society', url: 'https://www.planetary.org/articles/advocacy-success-fy2026-nasa-budget' },
    ],
  },
  {
    group: 'Funding',
    file: 'funding_benchmarks.csv',
    title: 'Funding page: for scale',
    feeds: 'The "For scale" panel on the Funding page.',
    method: 'Two published yearly totals shown for context only, never combined with or compared against the areas by the page.',
    fixedSources: [
      { name: 'SIPRI', url: 'https://www.sipri.org/media/press-release/2026/world-military-expenditure-rises' },
      { name: 'IMF', url: 'https://imf.org/en/Topics/climate-change/energy-subsidies' },
    ],
  },
  {
    group: 'Policies',
    file: 'not_covered.csv',
    title: 'Not covered yet',
    feeds: 'The Not covered yet page.',
    method: 'Hand-researched: for each area EarthOS does not cover in depth, one headline number and one line on where things stand, each with its named source and labelled measured, modelled or expert judgement. Not scored and not used by any other page. Checked by hand, outside the monthly refresh.',
  },
  {
    group: 'Policies',
    file: 'promises.csv',
    title: 'Promises',
    feeds: 'The Promises page.',
    method: 'Hand-researched: public commitments that have a source anyone can open and can be set beside a published number. Each row holds what was promised, who promised it and when, the deadline, the latest figure and, where one exists, a named source\'s projection. Where a promise matches a live indicator the latest figure is read from indicators.csv. EarthOS gives no verdict before a deadline; a result is shown only once a deadline has passed, and it is the named source\'s finding. Checked by hand each month.',
  },
  {
    group: 'Policies',
    file: 'priority_problems.csv',
    title: 'Priorities: the problem list',
    feeds: 'The Priorities page.',
    method: 'The fixed list of problems that every lens on the Priorities page is applied to. The list is set before any lens is applied, so no lens chooses its own candidates. The order in the file is not a ranking.',
  },
  {
    group: 'Policies',
    file: 'priority_lenses.csv',
    title: 'Priorities: the lenses',
    feeds: 'The Priorities page.',
    method: 'One row per way of ranking: the question it answers, its source, when the source asked or published, its main limit, and the size of error used for the stability test (25% either way unless the source states its own range). A lens with no figure-based ranking has no stability test.',
  },
  {
    group: 'Policies',
    file: 'priority_scores.csv',
    title: 'Priorities: figures by lens',
    feeds: 'The Priorities page.',
    method: 'Hand-researched: one row for every lens and every problem. A row either holds a published figure with its source, year and label (measured, modelled or expert judgement), or holds no figure and a note saying why. Nothing is estimated to fill a gap. Positions, coverage, stability and the top-three count are calculated from these rows; EarthOS sets no weights and publishes no combined ranking. In a reader\'s own ranking, a problem that fewer than three of the weighted lenses can see has its score topped up with neutral scores of 50, so thin evidence cannot reach the top or the bottom. Checked by hand each month.',
  },
  {
    group: 'Site',
    file: 'changelog.csv',
    title: 'Change log',
    feeds: 'The Change log page.',
    method: 'Hand-written entries for site, method and decision changes. Ingest scripts add a data entry automatically whenever they change data.',
  },
  {
    group: 'Site',
    file: 'refresh.csv',
    title: 'Data checks',
    feeds: 'The "Data checked" date in the footer of every page and on the Dashboard.',
    method: 'Written by scripts/ingest.py at the end of every full run: the monthly scheduled run on GitHub, or one started by hand. Records when the check ran, how many sources were checked and updated, and any that could not be reached. Keeps the last 36 checks.',
  },
];

const RETIRED = new Set<string>();
/** Files that hold configuration or EarthOS's own work, not downloaded data. */
const CONFIG = new Set([
  'tiers.csv', 'changelog.csv', 'targets.csv', 'indicator_info.csv', 'indicator_notes.csv', 'policy_master.csv', 'policy_gameplans.csv',
  'backtest.csv', 'backtest_p1.csv', 'backtest_p3.csv', 'refresh.csv',
]);

async function readRows(file: string) {
  try {
    return parseCsv(await readFile(path.join(DATA_DIR, file), 'utf8'));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

export async function getMethodologyData(): Promise<DatasetInfo[]> {
  const onDisk = (await readdir(DATA_DIR)).filter((f) => f.endsWith('.csv'));
  const listed = new Set(REGISTRY.map((e) => e.file));
  const unlisted = onDisk.filter((f) => !listed.has(f));
  if (unlisted.length) throw new Error(`lib/methodology.ts: add ${unlisted.join(', ')} to REGISTRY so the Methodology page lists every data file`);

  return Promise.all(
    REGISTRY.map(async ({ fixedSources, ...entry }) => {
      const rows = await readRows(entry.file);
      if (!rows) return { ...entry, status: 'missing' as const, rows: 0, illustrativeRows: 0, sources: [] };

      const illustrativeRows = rows.filter((r) => r.is_illustrative?.toLowerCase() === 'true').length;
      const seen = new Map<string, string | undefined>((fixedSources ?? []).map((src) => [src.name, src.url]));
      for (const r of rows) {
        const name = r.source || r.source_name || r.tracker || r.set_by || '';
        const url = r.source_url || undefined;
        if (name && !seen.has(name)) seen.set(name, url);
      }

      let status: DatasetStatus;
      if (RETIRED.has(entry.file)) status = 'retired';
      else if (CONFIG.has(entry.file)) status = 'real';
      else if (illustrativeRows === 0) status = 'real';
      else if (illustrativeRows === rows.length) status = 'illustrative';
      else status = 'mixed';

      return {
        ...entry,
        status,
        rows: rows.length,
        illustrativeRows,
        sources: [...seen].map(([name, url]) => ({ name, url })),
      };
    }),
  );
}
