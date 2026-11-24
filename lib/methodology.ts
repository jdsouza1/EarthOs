import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const DATA_DIR = path.join(process.cwd(), 'data');

export type DatasetStatus = 'real' | 'illustrative' | 'mixed' | 'missing' | 'retired';

export interface DatasetInfo {
  group: 'Dashboard' | 'Policies' | 'Forecasts' | 'Site';
  file: string;
  title: string;
  feeds: string;
  method: string;
  status: DatasetStatus;
  rows: number;
  illustrativeRows: number;
  sources: { name: string; url?: string }[];
}

export const DATASET_GROUPS = ['Dashboard', 'Policies', 'Forecasts', 'Site'] as const;
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
  'tiers.csv', 'changelog.csv', 'targets.csv', 'indicator_info.csv', 'policy_master.csv', 'policy_gameplans.csv',
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
