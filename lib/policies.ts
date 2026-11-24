import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';
import { getEmissions, type Emissions } from './emissions';

const FILE = 'policy_ratings.csv';

/** Climate Action Tracker overall ratings, best first. Anything else in the file fails the build. */
export const CAT_SCALE = [
  'Role model',
  '1.5°C Paris Agreement compatible',
  'Almost sufficient',
  'Insufficient',
  'Highly insufficient',
  'Critically insufficient',
] as const;
export type CatRating = (typeof CAT_SCALE)[number];

export interface PolicyRating {
  country: string;
  iso3: string;
  /** 'major' = largest emitters; 'closest' = countries rated closest to on track. */
  group: 'major' | 'closest';
  tracker: string;
  rating: CatRating;
  /** YYYY, YYYY-MM or YYYY-MM-DD, as precise as the source allows. */
  ratedOn: string;
  sourceUrl: string;
  note: string;
  /** Caveat shown above the gameplan, if any. */
  planNote: string;
  /** Tracker's separate rating of current policies and action, as published. */
  actionRating?: CatRating;
  /** Tracker's separate rating of the country's target against its fair share, as published. */
  targetRating?: CatRating;
  /** Share of world greenhouse gas emissions, if known (data/emissions.csv). */
  emissions?: Emissions;
}

export interface GameplanStep {
  step: number;
  /** Master-gameplan theme this step belongs to (see data/policy_master.csv). */
  theme: string;
  action: string;
  detail: string;
}

export async function getPolicyRatings(topic = 'climate'): Promise<PolicyRating[]> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  const rows = parseCsv(text).map((r, i) => ({ r, line: i + 2 })).filter(({ r }) => r.topic === topic);
  const emissions = await getEmissions();
  return rows.map(({ r, line }) => {
    if (r.group !== 'major' && r.group !== 'closest') throw new Error(`data/${FILE} line ${line}: group must be major or closest`);
    for (const col of ['country', 'iso3', 'tracker', 'rating', 'rated_on', 'source_url']) {
      if (!r[col]) throw new Error(`data/${FILE} line ${line}: ${col} is empty`);
    }
    if (!CAT_SCALE.includes(r.rating as CatRating)) throw new Error(`data/${FILE} line ${line}: unknown rating "${r.rating}"`);
    for (const k of ['action_rating', 'target_rating'] as const) {
      if (r[k] && !CAT_SCALE.includes(r[k] as CatRating)) throw new Error(`data/${FILE} line ${line}: unknown ${k} "${r[k]}"`);
    }
    if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(r.rated_on)) throw new Error(`data/${FILE} line ${line}: rated_on must be YYYY, YYYY-MM or YYYY-MM-DD`);
    if (!/^https:\/\//.test(r.source_url)) throw new Error(`data/${FILE} line ${line}: source_url must start with https://`);
    return {
      country: r.country,
      iso3: r.iso3,
      group: r.group as 'major' | 'closest',
      tracker: r.tracker,
      rating: r.rating as CatRating,
      ratedOn: r.rated_on,
      sourceUrl: r.source_url,
      note: r.note ?? '',
      planNote: r.plan_note ?? '',
      actionRating: r.action_rating ? (r.action_rating as CatRating) : undefined,
      targetRating: r.target_rating ? (r.target_rating as CatRating) : undefined,
      emissions: emissions.get(r.iso3),
    };
  });
}

const PLANS = 'policy_gameplans.csv';

/** Steps to get each country on track, keyed by iso3, in order. Summarised from the tracker's country pages. */
export async function getGameplans(topic = 'climate'): Promise<Map<string, GameplanStep[]>> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', PLANS), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw e;
  }
  const out = new Map<string, GameplanStep[]>();
  const themes = new Set((await getMasterPlan(topic)).map((m) => m.theme));
  parseCsv(text).forEach((r, i) => {
    const line = i + 2;
    if (r.topic !== topic) return;
    const step = Number(r.step);
    if (!r.iso3 || !r.action || !Number.isInteger(step)) throw new Error(`data/${PLANS} line ${line}: iso3, step and action are required`);
    if (!themes.has(r.theme)) throw new Error(`data/${PLANS} line ${line}: unknown theme "${r.theme}" (add it to policy_master.csv)`);
    out.set(r.iso3, [...(out.get(r.iso3) ?? []), { step, theme: r.theme, action: r.action, detail: r.detail ?? '' }]);
  });
  for (const steps of out.values()) steps.sort((a, b) => a.step - b.step);
  return out;
}

const MASTER = 'policy_master.csv';

export interface MasterStep {
  theme: string;
  title: string;
  why: string;
}

/** The shared steps every country's gameplan is tagged with, for one policy topic. */
export async function getMasterPlan(topic = 'climate'): Promise<MasterStep[]> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', MASTER), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  return parseCsv(text)
    .filter((r) => r.topic === topic)
    .map((r, i) => {
      if (!r.theme || !r.title) throw new Error(`data/${MASTER} line ${i + 2}: theme and title are required`);
      return { theme: r.theme, title: r.title, why: r.why ?? '' };
    });
}
