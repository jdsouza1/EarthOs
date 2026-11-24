export type TierId = 'existential' | 'systemic' | 'tech' | 'flourishing';
export type Severity = 'CRITICAL' | 'ELEVATED' | 'WARNING';
export type ChartType = 'line' | 'bar';

export interface TierSnapshot {
  id: TierId;
  name: string;
  score: number;
  status: string;
  chartType: ChartType;
  /** Plain-English description for the info tooltip. */
  about?: string;
  /** Low–high under method variants (see lib/scores.ts); null for placeholder data. */
  range?: [number, number] | null;
  /** low/high = range under method variants for that year (see lib/scores.ts). */
  history: { label: string; score: number; low?: number; high?: number }[];
}

/** One point per observation date, one key per tier. */
export type TierTrendPoint = { label: string } & Partial<Record<TierId, number>>;

export interface Bottleneck {
  rank: number;
  name: string;
  tierId: TierId;
  severity: Severity;
  /** 0–100, where 100 is the good end (see lib/scores.ts). */
  score: number;
  basis: 'target' | 'limit' | 'trend';
  /** Plain-English "what this measures" text, if any. */
  about?: string | null;
  /** Short reading beside the score, e.g. "85% now · below its 2019 level", so a 0 is not read as 0%. */
  context?: string | null;
}

/** An indicator whose score fell over the latest year (see lib/scores.ts). */
export interface Alert {
  id: string;
  name: string;
  tierId: TierId;
  /** Score now and one year earlier, 0–100 (100 = good end). */
  score: number;
  prevScore: number;
  basis: 'target' | 'limit' | 'trend';
  /** Latest reading and its change from a year earlier, in the indicator's own unit. */
  latest: { date: string; value: number };
  change1y: number | null;
  /** False for monthly series, where `latest` is a single month. */
  annual: boolean;
  unit: string;
  source: string;
  sourceUrl: string;
}

export interface DashboardData {
  tiers: TierSnapshot[];
  tierTrend: TierTrendPoint[];
  bottlenecks: Bottleneck[];
  /** Indicators whose score fell most over the latest year, largest fall first. */
  alerts: Alert[];
  /** How many indicators were compared for the alerts list. */
  alertsChecked: number;
  source: 'csv' | 'database';
  /** True while any number shown is placeholder rather than pipeline output. */
  isIllustrative: boolean;
}
