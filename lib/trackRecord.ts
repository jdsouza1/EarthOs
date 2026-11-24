import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';
import type { TierId } from './types';

/**
 * Past forecasts and what happened (data/track_record.csv). The rules from the design are enforced here:
 * published and sourced, about a number, target date passed, outcome from a named source, and a verdict
 * that matches the fixed rule below. A row that breaks one stops the build.
 */
export type Verdict = 'close' | 'too_high' | 'too_low' | 'wrong_direction';
export type Kind = 'value' | 'probability' | 'direction';
export type Impact = 'better' | 'worse' | 'mixed' | '';

export const VERDICT_LABEL: Record<Verdict, string> = {
  close: 'Close',
  too_high: 'Too high',
  too_low: 'Too low',
  wrong_direction: 'Wrong direction',
};

export const AREA_LABEL: Record<TierId, string> = {
  existential: 'Existential Survival',
  systemic: 'Systemic Health',
  tech: 'Clean Tech & Access',
  flourishing: 'Human Flourishing',
};

export interface TrackedForecast {
  id: string;
  order: number;
  area: TierId;
  title: string;
  who: string;
  made: number;
  targetYear: number;
  kind: Kind;
  forecast: string;
  low: number | null;
  high: number | null;
  outcome: string;
  outcomeValue: number | null;
  unit: string;
  verdict: Verdict;
  impact: Impact;
  note: string;
  forecastSource: { name: string; url: string };
  outcomeSource: { name: string; url: string };
  checked: string;
}

const FILE = 'track_record.csv';
const CLOSE_WITHIN = 0.1; // a single-figure forecast is "close" within 10%

/** The fixed rule. Exported so the page can explain it and tests could call it. */
export function ruleVerdict(f: Pick<TrackedForecast, 'kind' | 'low' | 'high' | 'outcomeValue'> & { forecastDir?: string; outcomeDir?: string }): Verdict {
  if (f.kind === 'direction') return f.forecastDir === f.outcomeDir ? 'close' : 'wrong_direction';
  const { low, high, outcomeValue: o } = f as { low: number; high: number; outcomeValue: number };
  if (f.kind === 'probability') {
    // The event happened (100) or did not (0). Odds under 50% for something that happened were too low.
    if (o === 100) return high < 50 ? 'too_low' : 'close';
    return low > 50 ? 'too_high' : 'close';
  }
  if (low === high) {
    const off = (o - low) / low;
    if (Math.abs(off) <= CLOSE_WITHIN) return 'close';
    return off < 0 ? 'too_high' : 'too_low';
  }
  if (o < low) return 'too_high';
  if (o > high) return 'too_low';
  return 'close';
}

export async function getTrackRecord(): Promise<TrackedForecast[]> {
  const rows = parseCsv(await readFile(path.join(process.cwd(), 'data', FILE), 'utf8'));
  const thisYear = new Date().getFullYear();
  const seen = new Set<string>();

  return rows
    .map((r, i) => {
      const fail = (msg: string): never => {
        throw new Error(`data/${FILE} line ${i + 2} (${r.id || 'no id'}): ${msg}`);
      };
      const num = (v: string, name: string) => {
        if (v === '' || v === undefined) return null;
        const n = Number(v);
        if (!Number.isFinite(n)) fail(`${name} must be a number, got "${v}"`);
        return n;
      };
      if (!r.id || seen.has(r.id)) fail('id is missing or repeated');
      seen.add(r.id);
      if (!(r.area in AREA_LABEL)) fail(`area must be one of ${Object.keys(AREA_LABEL).join(', ')}`);
      if (!['value', 'probability', 'direction'].includes(r.kind)) fail('kind must be value, probability or direction');
      if (!(r.verdict in VERDICT_LABEL)) fail(`verdict must be one of ${Object.keys(VERDICT_LABEL).join(', ')}`);
      if (!['better', 'worse', 'mixed', ''].includes(r.impact)) fail('impact must be better, worse, mixed or empty');
      for (const k of ['title', 'who', 'forecast', 'outcome', 'forecast_source', 'outcome_source'] as const) if (!r[k]) fail(`${k} is empty`);
      for (const k of ['forecast_url', 'outcome_url'] as const) if (!/^https:\/\//.test(r[k] ?? '')) fail(`${k} must be an https link`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked)) fail('checked must be YYYY-MM-DD');

      const made = num(r.made, 'made')!;
      const targetYear = num(r.target_year, 'target_year')!;
      // Rule 3: only forecasts whose target date has passed.
      if (!(targetYear < thisYear)) fail(`target_year ${targetYear} has not passed yet`);
      if (!(made < targetYear)) fail('made must be before target_year');

      const low = num(r.forecast_low, 'forecast_low');
      const high = num(r.forecast_high, 'forecast_high');
      const outcomeValue = num(r.outcome_value, 'outcome_value');
      if (r.kind === 'direction') {
        if (!['up', 'down'].includes(r.forecast_dir) || !['up', 'down'].includes(r.outcome_dir)) fail('direction forecasts need forecast_dir and outcome_dir of up or down');
      } else {
        // Rule 2: about a number.
        if (low === null || high === null || outcomeValue === null) fail('forecast_low, forecast_high and outcome_value are needed');
        if (low! > high!) fail('forecast_low is above forecast_high');
        if (r.kind === 'probability' && ![0, 100].includes(outcomeValue!)) fail('outcome_value for a probability must be 100 (happened) or 0 (did not)');
      }
      const ruled = ruleVerdict({ kind: r.kind as Kind, low, high, outcomeValue, forecastDir: r.forecast_dir, outcomeDir: r.outcome_dir });
      if (ruled !== r.verdict) fail(`verdict "${r.verdict}" does not match the rule, which gives "${ruled}"`);
      if (ruled === 'close' && r.impact) fail('a close forecast has no better/worse reading; leave impact empty');

      return {
        id: r.id,
        order: num(r.order, 'order') ?? i,
        area: r.area as TierId,
        title: r.title,
        who: r.who,
        made,
        targetYear,
        kind: r.kind as Kind,
        forecast: r.forecast,
        low,
        high,
        outcome: r.outcome,
        outcomeValue,
        unit: r.unit,
        verdict: r.verdict as Verdict,
        impact: r.impact as Impact,
        note: r.note ?? '',
        forecastSource: { name: r.forecast_source, url: r.forecast_url },
        outcomeSource: { name: r.outcome_source, url: r.outcome_url },
        checked: r.checked,
      };
    })
    .sort((a, b) => a.order - b.order);
}
