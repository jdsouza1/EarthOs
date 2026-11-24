import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'expert_forecasts.csv';

/** What is being estimated. Different definitions are never drawn on the same scale group. */
export const OUTCOMES = ['extinction', 'catastrophe', 'existential'] as const;
export type Outcome = (typeof OUTCOMES)[number];

export const OUTCOME_LABEL: Record<Outcome, string> = {
  extinction: 'Human extinction',
  catastrophe: 'Global catastrophe',
  existential: 'Existential catastrophe',
};

export interface ExpertForecast {
  id: string;
  sourceName: string;
  sourceUrl: string;
  /** YYYY-MM when the estimate was published (for Metaculus: the snapshot date). */
  published: string;
  group: string;
  risk: string;
  outcome: Outcome;
  outcomeDefinition: string;
  horizon: string;
  /** Percent, as published. */
  value: number;
  low: number | null;
  high: number | null;
  note: string;
  retrieved: string;
}

/**
 * Published estimates of catastrophe and extinction risk, shown as published.
 * EarthOS never averages, weights or adds to them. Bad rows fail the build.
 */
export async function getExpertForecasts(): Promise<ExpertForecast[]> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  const seen = new Set<string>();
  return parseCsv(text).map((r, i) => {
    const line = i + 2;
    const fail = (msg: string): never => {
      throw new Error(`data/${FILE} line ${line}: ${msg}`);
    };
    if (!r.id) fail('id is required');
    if (seen.has(r.id)) fail(`duplicate id "${r.id}"`);
    seen.add(r.id);
    if (!OUTCOMES.includes(r.outcome as Outcome)) fail(`outcome must be one of ${OUTCOMES.join(', ')}`);
    if (!r.source_name || !/^https:\/\//.test(r.source_url)) fail('every estimate needs a source name and an https source_url');
    if (r.confidence !== 'expert') fail('confidence must be "expert": these are other people\'s estimates');
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(r.published)) fail('published must be YYYY-MM or YYYY-MM-DD');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.retrieved)) fail('retrieved must be YYYY-MM-DD');
    const num = (s: string, name: string) => {
      if (s === '') return null;
      const n = Number(s);
      if (!Number.isFinite(n) || n <= 0 || n > 100) fail(`${name} must be a percentage above 0 and at most 100`);
      return n;
    };
    const value = num(r.value_pct, 'value_pct');
    if (value === null) fail('value_pct is required');
    const low = num(r.low_pct, 'low_pct');
    const high = num(r.high_pct, 'high_pct');
    if ((low === null) !== (high === null)) fail('give both low_pct and high_pct, or neither');
    if (low !== null && high !== null && !(low <= value! && value! <= high)) fail('low_pct ≤ value_pct ≤ high_pct');
    return {
      id: r.id,
      sourceName: r.source_name,
      sourceUrl: r.source_url,
      published: r.published,
      group: r.group,
      risk: r.risk,
      outcome: r.outcome as Outcome,
      outcomeDefinition: r.outcome_definition,
      horizon: r.horizon,
      value: value!,
      low,
      high,
      note: r.note,
      retrieved: r.retrieved,
    };
  });
}

export interface Scenario {
  indicatorId: string;
  sourceName: string;
  sourceUrl: string;
  published: string;
  scenario: string;
  description: string;
  period: string;
  value: number;
  low: number | null;
  high: number | null;
  unit: string;
  note: string;
  retrieved: string;
}

/**
 * Long-range scenarios published by named bodies (IPCC, UNEP, UN), labelled "modelled".
 * EarthOS runs no projection of its own past 10 years. Bad rows fail the build.
 */
export async function getScenarios(): Promise<Scenario[]> {
  const FILE2 = 'scenarios.csv';
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE2), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  return parseCsv(text).map((r, i) => {
    const fail = (msg: string): never => {
      throw new Error(`data/${FILE2} line ${i + 2}: ${msg}`);
    };
    if (!r.indicator_id || !r.scenario) fail('indicator_id and scenario are required');
    if (!r.source_name || !/^https:\/\//.test(r.source_url)) fail('every scenario needs a source name and an https source_url');
    if (r.confidence !== 'modelled') fail('confidence must be "modelled": these are outputs of published models');
    if (!/^\d{4}-\d{2}(-\d{2})?$/.test(r.published)) fail('published must be YYYY-MM or YYYY-MM-DD');
    const num = (s: string) => {
      if (s === '') return null;
      const n = Number(s);
      if (!Number.isFinite(n)) fail(`"${s}" is not a number`);
      return n;
    };
    const value = num(r.value);
    if (value === null) fail('value is required');
    const low = num(r.low);
    const high = num(r.high);
    if ((low === null) !== (high === null)) fail('give both low and high, or neither');
    if (low !== null && high !== null && !(low <= value! && value! <= high)) fail('low ≤ value ≤ high');
    return {
      indicatorId: r.indicator_id,
      sourceName: r.source_name,
      sourceUrl: r.source_url,
      published: r.published,
      scenario: r.scenario,
      description: r.description,
      period: r.period,
      value: value!,
      low,
      high,
      unit: r.unit,
      note: r.note,
      retrieved: r.retrieved,
    };
  });
}
