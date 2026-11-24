import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';
import { computeScores } from './scores';
import type { Alert, Bottleneck, ChartType, DashboardData, Severity, TierId, TierSnapshot, TierTrendPoint } from './types';
import { getIndicatorInfo } from './indicatorInfo';
import { getIndicators } from './indicators';

const DATA_DIR = path.join(process.cwd(), 'data');
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });
const HISTORY_POINTS = 6;
const MAX_BOTTLENECKS = 5;
const MAX_ALERTS = 5;
/** A fall smaller than this (in score points) is treated as no change. */
const ALERT_MIN_DROP = 0.5;
const TIER_IDS: TierId[] = ['existential', 'systemic', 'tech', 'flourishing'];

type Row = Record<string, string>;

/** Bad data fails the build loudly instead of deploying a wrong number. */
class DataError extends Error {
  constructor(file: string, line: number, msg: string) {
    super(`data/${file} line ${line}: ${msg}`);
  }
}

async function load(file: string, required: string[]): Promise<{ file: string; rows: Row[] }> {
  const rows = parseCsv(await readFile(path.join(DATA_DIR, file), 'utf8'));
  if (rows.length === 0) throw new DataError(file, 1, 'file has no data rows');
  const missing = required.filter((c) => !(c in rows[0]));
  if (missing.length) throw new DataError(file, 1, `missing column(s): ${missing.join(', ')}`);
  return { file, rows };
}

function num(file: string, i: number, row: Row, col: string, opts: { min?: number; max?: number } = {}) {
  const raw = row[col];
  const n = Number(raw);
  if (raw === '' || Number.isNaN(n)) throw new DataError(file, i + 2, `${col} must be a number, got "${raw}"`);
  if (opts.min !== undefined && n < opts.min) throw new DataError(file, i + 2, `${col} below ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) throw new DataError(file, i + 2, `${col} above ${opts.max}`);
  return n;
}

function tierId(file: string, i: number, value: string): TierId {
  if (!TIER_IDS.includes(value as TierId)) throw new DataError(file, i + 2, `unknown tier "${value}"`);
  return value as TierId;
}

const SEVERITY_CUTOFFS: [number, Severity][] = [
  [15, 'CRITICAL'],
  [35, 'ELEVATED'],
  [Infinity, 'WARNING'],
];
const TREND_YEARS = 5;
const TREND_BAND = 2;

/**
 * Dashboard data computed from real indicators and official targets (see lib/scores.ts).
 * Falls back to the illustrative placeholder files only when no indicator data exists yet.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const scores = await computeScores();
  if (!scores) throw new Error('data/indicators.csv is missing or empty: run scripts/ingest.py (run-setup.bat) before building.');
  const info = await getIndicatorInfo();

  const tiers = await load('tiers.csv', ['id', 'name', 'chart_type', 'sort_order']);
  const short = (y: number) => `'${String(y).slice(2)}`;

  const tierSnapshots: TierSnapshot[] = tiers.rows
    .map((t, i) => {
      if (t.chart_type !== 'line' && t.chart_type !== 'bar') throw new DataError(tiers.file, i + 2, 'chart_type must be line or bar');
      const id = tierId(tiers.file, i, t.id);
      const hist = scores.years
        .map((y, k) => ({ y, v: scores.tierHistory[id][k], r: scores.tierRangeHistory[id][k] }))
        .filter((p): p is { y: number; v: number; r: [number, number] | null } => p.v !== null);
      const latest = hist[hist.length - 1];
      const past = hist.find((p) => p.y === (latest?.y ?? 0) - TREND_YEARS);
      const delta = latest && past ? latest.v - past.v : 0;
      const status = !latest ? 'No data' : delta > TREND_BAND ? 'Improving' : delta < -TREND_BAND ? 'Degrading' : 'Stagnant';
      return {
        order: num(tiers.file, i, t, 'sort_order'),
        snap: {
          id,
          name: t.name,
          status,
          chartType: t.chart_type as ChartType,
          about: t.about || undefined,
          score: latest ? Math.round(latest.v) : 0,
          range: scores.tierRange[id] ? (scores.tierRange[id]!.map(Math.round) as [number, number]) : null,
          history: hist.slice(-HISTORY_POINTS).map((p) => ({
            label: short(p.y),
            score: Math.round(p.v * 10) / 10,
            ...(p.r ? { low: Math.round(p.r[0]), high: Math.round(p.r[1]) } : {}),
          })),
        },
      };
    })
    .sort((a, b) => a.order - b.order)
    .map((t) => t.snap);

  const tierTrend: TierTrendPoint[] = scores.years.map((y, k) => {
    const point: TierTrendPoint = { label: String(y) };
    for (const t of TIER_IDS) {
      const v = scores.tierHistory[t][k];
      if (v !== null) point[t] = Math.round(v * 10) / 10;
    }
    return point;
  });

  const bottlenecks: Bottleneck[] = [...scores.indicators]
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_BOTTLENECKS)
    .map((x, idx) => ({
      rank: idx + 1,
      name: x.name,
      tierId: x.tierId,
      severity: SEVERITY_CUTOFFS.find(([cut]) => x.score < cut)![1],
      score: Math.round(x.score),
      basis: x.basis,
      about: info.get(x.id) ?? null,
    }));

  const raw = new Map((await getIndicators()).map((x) => [x.id, x]));
  const alerts: Alert[] = scores.indicators
    .filter((x) => x.prevScore !== null && x.prevScore - x.score >= ALERT_MIN_DROP && raw.has(x.id))
    .sort((a, b) => b.prevScore! - b.score - (a.prevScore! - a.score))
    .slice(0, MAX_ALERTS)
    .map((x) => {
      const r = raw.get(x.id)!;
      return {
        id: x.id,
        name: x.name,
        tierId: x.tierId,
        score: Math.round(x.score * 10) / 10,
        prevScore: Math.round(x.prevScore! * 10) / 10,
        basis: x.basis,
        latest: r.latest,
        change1y: r.change1y,
        annual: r.annual,
        unit: r.unit,
        source: r.source,
        sourceUrl: r.sourceUrl,
      };
    });

  const alertsChecked = scores.indicators.filter((x) => x.prevScore !== null).length;
  return { tiers: tierSnapshots, tierTrend, bottlenecks, alerts, alertsChecked, source: 'csv', isIllustrative: scores.isIllustrative };
}
