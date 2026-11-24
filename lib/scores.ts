import { isAnnual, loadIndicatorSeries, type Series } from './indicators';
import { getTargets, targetStatus, type Target } from './targets';
import type { TierId } from './types';

/**
 * Scoring method (v2). Published on the Methodology page; change it only with a change-log entry.
 *
 * Every indicator gets a 0–100 score, where 100 is the good end:
 *  - reach target: share of the distance from the baseline year to the target already covered
 *    (0 if it has moved away, capped at 100 when reached).
 *  - limit:        headroom left under the limit (1.46 of 1.5 °C used → about 3).
 *  - direction:    10-year trend. 50 means flat; each 1% change in the better direction adds
 *                  5 points (capped 0–100). Monthly series compare 12-month means.
 *  - no better direction (e.g. AI investment): not scored.
 * A tier's score is the plain average of its scored indicators (equal weights), except that
 * indicators measuring the same thing are first averaged into one group (v3: CO2, methane and
 * nitrous oxide form one greenhouse-gas group), so one cause cannot fill a tier on its own.
 * Scores for past years use only data published up to that year; slow series carry their
 * latest value forward.
 */
export const METHOD_VERSION = 'v3';
/** v3: indicators that share a group count as one item in their tier's average. */
export const SCORE_GROUPS: Record<string, { id: string; label: string }> = {
  co2_ppm_mlo: { id: 'ghg', label: 'Greenhouse gases' },
  ch4_ppb_global: { id: 'ghg', label: 'Greenhouse gases' },
  n2o_ppb_global: { id: 'ghg', label: 'Greenhouse gases' },
};
/** Average a tier's indicator scores, with grouped indicators averaged into one item first. */
export function tierMean(items: { id: string; score: number }[], groups: Record<string, { id: string }> = SCORE_GROUPS): number | null {
  const buckets = new Map<string, number[]>();
  for (const { id, score } of items) {
    const key = groups[id]?.id ?? id;
    buckets.set(key, [...(buckets.get(key) ?? []), score]);
  }
  if (items.length < 2) return null;
  const means = [...buckets.values()].map((xs) => xs.reduce((a, b) => a + b, 0) / xs.length);
  return means.reduce((a, b) => a + b, 0) / means.length;
}
/** Trend scoring: 50 = flat over TREND_SPAN years; each 1% change in the better direction adds POINTS_PER_PCT. */
export const TREND_SPAN = 10;
export const POINTS_PER_PCT = 5;
/**
 * Uncertainty range: the tier score is recomputed under every reasonable variant of the method
 * and the lowest and highest results are shown. Variants: trend window of 5, 10 or 15 years;
 * 2.5, 5 or 10 points per 1% change; and leaving out each indicator in turn (does one series
 * drive the tier?). This measures how much the score depends on our choices, not measurement error.
 */
export const SENSITIVITY = { trendSpans: [5, 10, 15], pointsPerPct: [2.5, 5, 10] };
export const HISTORY_YEARS = 11;

export interface IndicatorScore {
  id: string;
  tierId: TierId;
  name: string;
  basis: 'target' | 'limit' | 'trend';
  score: number;
  /** Score one year earlier, scored with only the data published by then (null if not available). */
  prevScore: number | null;
}

const year = (d: string) => Number(d.slice(0, 4));
const clamp = (x: number) => Math.max(0, Math.min(1, x));

interface Opts {
  trendSpan: number;
  pointsPerPct: number;
}
const BASE: Opts = { trendSpan: TREND_SPAN, pointsPerPct: POINTS_PER_PCT };

function scoreAt(series: Series, target: Target | undefined, upTo: number, opts: Opts = BASE): { score: number; basis: IndicatorScore['basis'] } | null {
  if (!target || target.better === 'none') return null;
  const pts = series.points.filter((p) => year(p.date) <= upTo);
  if (pts.length === 0) return null;
  const annual = isAnnual(series.points);

  if (target.kind === 'reach') {
    if (target.baselineYear !== null && upTo < target.baselineYear) return null;
    const s = targetStatus(target, pts, annual);
    return s.progress === null ? null : { score: clamp(s.progress) * 100, basis: 'target' };
  }
  if (target.kind === 'limit') {
    const s = targetStatus(target, pts, annual);
    return s.level === null || s.limit === null ? null : { score: clamp(1 - s.level / s.limit) * 100, basis: 'limit' };
  }
  // direction: 10-year trend. Monthly series compare 12-month means to remove seasons.
  const last = pts[pts.length - 1];
  const tenBack = `${Number(last.date.slice(0, 4)) - opts.trendSpan}${last.date.slice(4)}`;
  const window = (end: string) => {
    const xs = pts.filter((p) => p.date <= end);
    if (xs.length === 0) return null;
    const take = annual ? xs.slice(-1) : xs.slice(-12);
    if (!annual && take.length < 12) return null;
    // Annual series: the reading must fall within a year of the date asked for.
    if (annual && year(end) - year(take[0].date) > 1) return null;
    return take.reduce((a, p) => a + p.value, 0) / take.length;
  };
  const now = window(last.date);
  const then = window(tenBack);
  if (now === null || then === null || then === 0) return null;
  const pctChange = ((now - then) / Math.abs(then)) * 100;
  const better = target.better === 'higher' ? pctChange : -pctChange;
  return { score: clamp(0.5 + (better * opts.pointsPerPct) / 100) * 100, basis: 'trend' };
}

export interface Scores {
  latestYear: number;
  years: number[];
  /** tier → score per year in `years` (null where fewer than 2 indicators had data). */
  tierHistory: Record<TierId, (number | null)[]>;
  /** Latest-year tier score under every reasonable variant of the method: [low, high]. */
  tierRange: Record<TierId, [number, number] | null>;
  /** The same range for every year in `years` (null where the tier had no score). */
  tierRangeHistory: Record<TierId, ([number, number] | null)[]>;
  /** Latest score per scored indicator. */
  indicators: IndicatorScore[];
  isIllustrative: boolean;
}

const TIERS: TierId[] = ['existential', 'systemic', 'tech', 'flourishing'];

export async function computeScores(): Promise<Scores | null> {
  const [series, targets] = await Promise.all([loadIndicatorSeries(), getTargets()]);
  if (series.size === 0) return null;

  const latestYear = Math.max(...[...series.values()].map((s) => year(s.points[s.points.length - 1].date)));
  const years = Array.from({ length: HISTORY_YEARS }, (_, i) => latestYear - HISTORY_YEARS + 1 + i);

  const tierHistory = Object.fromEntries(TIERS.map((t) => [t, [] as (number | null)[]])) as Scores['tierHistory'];
  for (const y of years) {
    const byTier = new Map<TierId, { id: string; score: number }[]>();
    for (const [id, s] of series) {
      const r = scoreAt(s, targets.get(id), y);
      if (!r) continue;
      const tier = s.meta.tier_id as TierId;
      byTier.set(tier, [...(byTier.get(tier) ?? []), { id, score: r.score }]);
    }
    for (const t of TIERS) tierHistory[t].push(tierMean(byTier.get(t) ?? []));
  }

  const indicators: IndicatorScore[] = [];
  for (const [id, s] of series) {
    const r = scoreAt(s, targets.get(id), latestYear);
    const prev = scoreAt(s, targets.get(id), latestYear - 1);
    if (r) indicators.push({ id, tierId: s.meta.tier_id as TierId, name: s.meta.name, basis: r.basis, score: r.score, prevScore: prev ? prev.score : null });
  }

  // Sensitivity: rescore each year under each variant and keep the spread per tier.
  const rangeFor = (y: number) => {
    const variants: number[][] = TIERS.map(() => []);
    const scoreTiers = (opts: Opts, skip?: string) => {
      const byTier = new Map<TierId, { id: string; score: number }[]>();
      for (const [id, s] of series) {
        if (id === skip) continue;
        const r = scoreAt(s, targets.get(id), y, opts);
        if (!r) continue;
        const tier = s.meta.tier_id as TierId;
        byTier.set(tier, [...(byTier.get(tier) ?? []), { id, score: r.score }]);
      }
      TIERS.forEach((t, k) => {
        const m = tierMean(byTier.get(t) ?? []);
        if (m !== null) variants[k].push(m);
      });
    };
    for (const trendSpan of SENSITIVITY.trendSpans)
      for (const pointsPerPct of SENSITIVITY.pointsPerPct) scoreTiers({ trendSpan, pointsPerPct });
    for (const id of series.keys()) scoreTiers(BASE, id); // leave one indicator out
    return TIERS.map((_, k) => (variants[k].length ? ([Math.min(...variants[k]), Math.max(...variants[k])] as [number, number]) : null));
  };
  const perYear = years.map(rangeFor);
  const tierRangeHistory = Object.fromEntries(TIERS.map((t, k) => [t, perYear.map((r) => r[k])])) as Scores['tierRangeHistory'];
  const tierRange = Object.fromEntries(TIERS.map((t) => [t, tierRangeHistory[t][years.length - 1]])) as Scores['tierRange'];

  return {
    latestYear,
    years,
    tierHistory,
    tierRange,
    tierRangeHistory,
    indicators,
    isIllustrative: [...series.values()].some((s) => s.illustrative),
  };
}
