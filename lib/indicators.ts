import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';
import type { TierId } from './types';
import { getTargets, targetStatus, type TargetStatus } from './targets';
import { getIndicatorInfo } from './indicatorInfo';

const FILE = 'indicators.csv';
const TIER_IDS: TierId[] = ['existential', 'systemic', 'tech', 'flourishing'];
const SPARK_MONTHS = 360; // 30 years of monthly data on the sparkline

export interface Indicator {
  id: string;
  tierId: TierId;
  name: string;
  /** Plain-English explanation shown in the card's info tooltip. */
  about: string | null;
  unit: string;
  source: string;
  sourceUrl: string;
  retrievedAt: string;
  annual: boolean;
  /** True if any row is flagged is_illustrative (shown as a placeholder, not "Real"). */
  isIllustrative: boolean;
  count: number;
  first: { date: string; value: number };
  latest: { date: string; value: number };
  /** Change vs one year before the latest reading (null if not available). */
  change1y: number | null;
  /** Change vs ten years before the latest reading (null if not available). */
  change10y: number | null;
  spark: { date: string; value: number }[];
  target: TargetStatus | null;
}

export interface Series {
  meta: Record<string, string>;
  illustrative: boolean;
  /** Sorted oldest first. */
  points: { date: string; value: number }[];
}

/**
 * Raw series from data/indicators.csv (written by scripts/ingest.py), keyed by indicator_id.
 * Empty when the file doesn't exist yet. Bad rows fail the build, like every data file.
 */
export async function loadIndicatorSeries(): Promise<Map<string, Series>> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw e;
  }

  const groups = new Map<string, Series>();
  parseCsv(text).forEach((r, i) => {
    const line = i + 2;
    if (!TIER_IDS.includes(r.tier_id as TierId)) throw new Error(`data/${FILE} line ${line}: unknown tier "${r.tier_id}"`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.observed_at)) throw new Error(`data/${FILE} line ${line}: observed_at must be YYYY-MM-DD`);
    const value = Number(r.value);
    if (r.value === '' || Number.isNaN(value)) throw new Error(`data/${FILE} line ${line}: value must be a number, got "${r.value}"`);
    const flag = (r.is_illustrative ?? '').toLowerCase();
    if (flag !== 'true' && flag !== 'false') throw new Error(`data/${FILE} line ${line}: is_illustrative must be true or false`);
    const g = groups.get(r.indicator_id) ?? { meta: r, illustrative: false, points: [] };
    g.points.push({ date: r.observed_at, value });
    g.illustrative ||= flag === 'true';
    g.meta = r; // last row carries the newest retrieval metadata
    groups.set(r.indicator_id, g);
  });
  for (const g of groups.values()) g.points.sort((a, b) => a.date.localeCompare(b.date));
  return groups;
}

/** Indicators ready for the dashboard cards. */
export async function getIndicators(): Promise<Indicator[]> {
  const groups = await loadIndicatorSeries();
  const targets = await getTargets();
  const info = await getIndicatorInfo();

  return [...groups.entries()].map(([id, { meta, illustrative, points }]) => {
    const latest = points[points.length - 1];
    const annual = isAnnual(points);
    const back = (years: number) => {
      const target = shiftYears(latest.date, -years);
      const hit = points.find((p) => p.date === target);
      return hit ? round(latest.value - hit.value) : null;
    };
    return {
      id,
      tierId: meta.tier_id as TierId,
      name: meta.name,
      about: info.get(id) ?? null,
      unit: meta.unit,
      source: meta.source,
      sourceUrl: meta.source_url,
      retrievedAt: meta.retrieved_at,
      annual,
      isIllustrative: illustrative,
      count: points.length,
      first: points[0],
      latest,
      change1y: back(1),
      change10y: back(10),
      spark: annual ? points : points.slice(-SPARK_MONTHS),
      target: targets.has(id) ? targetStatus(targets.get(id)!, points, annual) : null,
    };
  });
}

export function isAnnual(points: { date: string }[]) {
  if (points.length < 3) return points.every((p) => p.date.endsWith('-01-01'));
  const gaps = points.slice(1, 25).map((p, i) => (Date.parse(p.date) - Date.parse(points[i].date)) / 86_400_000);
  const median = gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)];
  return median > 200;
}

function shiftYears(date: string, years: number) {
  return `${String(Number(date.slice(0, 4)) + years).padStart(4, '0')}${date.slice(4)}`;
}

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}
