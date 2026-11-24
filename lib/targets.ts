import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'targets.csv';
type Kind = 'reach' | 'limit' | 'direction';
type Better = 'lower' | 'higher' | 'none';

export interface Target {
  indicatorId: string;
  kind: Kind;
  target: number | null;
  better: Better;
  baselineYear: number | null;
  deadline: number | null;
  rebase: [number, number] | null;
  label: string;
  setBy: string;
  sourceUrl: string;
  note: string;
}

export interface TargetStatus {
  kind: Kind;
  better: Better;
  label: string;
  setBy: string;
  sourceUrl: string;
  note: string;
  deadline: number | null;
  /** reach: share of the distance from baseline to target covered, 0–1+. Negative = moved away. */
  progress: number | null;
  baseline: { year: number; value: number } | null;
  /** limit: current level on the target's scale (e.g. °C above pre-industrial) and the limit. */
  level: number | null;
  limit: number | null;
}

export async function getTargets(): Promise<Map<string, Target>> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw e;
  }
  const out = new Map<string, Target>();
  parseCsv(text).forEach((r, i) => {
    const line = i + 2;
    const fail = (msg: string) => {
      throw new Error(`data/${FILE} line ${line}: ${msg}`);
    };
    const kind = r.kind as Kind;
    if (!['reach', 'limit', 'direction'].includes(kind)) fail(`kind must be reach/limit/direction, got "${r.kind}"`);
    const better = r.better as Better;
    if (!['lower', 'higher', 'none'].includes(better)) fail(`better must be lower/higher/none, got "${r.better}"`);
    const num = (v: string, col: string) => {
      if (v === '') return null;
      const n = Number(v);
      if (Number.isNaN(n)) fail(`${col} must be a number, got "${v}"`);
      return n;
    };
    const target = num(r.target, 'target');
    if (kind !== 'direction' && target === null) fail('target is required for reach and limit');
    const baselineYear = num(r.baseline_year, 'baseline_year');
    if (kind === 'reach' && baselineYear === null) fail('baseline_year is required for reach');
    const from = num(r.rebase_from, 'rebase_from');
    const to = num(r.rebase_to, 'rebase_to');
    if (out.has(r.indicator_id)) fail(`duplicate indicator_id "${r.indicator_id}"`);
    out.set(r.indicator_id, {
      indicatorId: r.indicator_id,
      kind,
      target,
      better,
      baselineYear,
      deadline: num(r.deadline, 'deadline'),
      rebase: from !== null && to !== null ? [from, to] : null,
      label: r.label,
      setBy: r.set_by,
      sourceUrl: r.source_url,
      note: r.note,
    });
  });
  return out;
}

const year = (d: string) => Number(d.slice(0, 4));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function targetStatus(t: Target, points: { date: string; value: number }[], annual: boolean): TargetStatus {
  const latest = points[points.length - 1];
  const base: TargetStatus = {
    kind: t.kind,
    better: t.better,
    label: t.label,
    setBy: t.setBy,
    sourceUrl: t.sourceUrl,
    note: t.note,
    deadline: t.deadline,
    progress: null,
    baseline: null,
    level: null,
    limit: null,
  };

  if (t.kind === 'reach' && t.target !== null && t.baselineYear !== null) {
    const inYear = points.filter((p) => year(p.date) === t.baselineYear);
    if (inYear.length === 0) throw new Error(`data/${FILE}: ${t.indicatorId} has no data for baseline year ${t.baselineYear}`);
    const b = mean(inYear.map((p) => p.value));
    const span = t.target - b;
    base.baseline = { year: t.baselineYear, value: b };
    base.progress = span === 0 ? 1 : (latest.value - b) / span;
  }

  if (t.kind === 'limit' && t.target !== null) {
    // Monthly series are noisy: compare the latest 12-month mean, not one month.
    const recent = annual ? latest.value : mean(points.slice(-12).map((p) => p.value));
    let offset = 0;
    if (t.rebase) {
      const [from, to] = t.rebase;
      const window = points.filter((p) => year(p.date) >= from && year(p.date) <= to).map((p) => p.value);
      if (window.length === 0) throw new Error(`data/${FILE}: ${t.indicatorId} has no data for ${from}-${to}`);
      offset = mean(window);
    }
    base.level = recent - offset;
    base.limit = t.target;
  }

  return base;
}
