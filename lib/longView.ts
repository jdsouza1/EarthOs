import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';
import { loadIndicatorSeries } from './indicators';

/**
 * The long view on the Deep time page: published reconstructions (data/long_view.csv, built once by
 * scripts/long_view.py) beside the measured record. Measured and reconstructed stretches are kept as
 * separate lines and are never joined. Where EarthOS keeps a live indicator (Mauna Loa CO2), its
 * measured line is read from indicators.csv so it stays current with the monthly refresh.
 */
export type PointKind = 'measured' | 'reconstructed';
export interface LongPoint {
  year: number;
  value: number;
  low: number | null;
  high: number | null;
}
export interface LongSeries {
  id: string;
  title: string;
  unit: string;
  axis: 'year' | 'years_ago';
  measuredLabel: string;
  reconstructedLabel: string;
  measured: LongPoint[];
  reconstructed: LongPoint[];
  /** Year the dashboard's own chart starts, if EarthOS has a live card for this. */
  dashboardFrom: number | null;
  liveIndicator: string | null;
  source: { name: string; url: string; landing: string };
  note: string;
  checked: string;
}

const SERIES = 'long_view_series.csv';
const POINTS = 'long_view.csv';
const read = (f: string) => readFile(path.join(process.cwd(), 'data', f), 'utf8');

export async function getLongView(): Promise<LongSeries[]> {
  const [metaText, pointText, live] = await Promise.all([read(SERIES), read(POINTS), loadIndicatorSeries()]);
  const pts = new Map<string, { measured: LongPoint[]; reconstructed: LongPoint[] }>();
  parseCsv(pointText).forEach((r, i) => {
    const fail = (m: string): never => {
      throw new Error(`data/${POINTS} line ${i + 2}: ${m}`);
    };
    if (r.kind !== 'measured' && r.kind !== 'reconstructed') fail('kind must be measured or reconstructed');
    const p: LongPoint = {
      year: Number(r.year),
      value: Number(r.value),
      low: r.low === '' ? null : Number(r.low),
      high: r.high === '' ? null : Number(r.high),
    };
    if (!Number.isInteger(p.year) || !Number.isFinite(p.value)) fail('year and value must be numbers');
    if ((p.low === null) !== (p.high === null)) fail('low and high go together');
    if (p.low !== null && !(p.low <= p.value && p.value <= p.high!)) fail('value must sit inside low to high');
    const s = pts.get(r.series_id) ?? { measured: [], reconstructed: [] };
    s[r.kind as PointKind].push(p);
    pts.set(r.series_id, s);
  });

  const seen = new Set<string>();
  const out = parseCsv(metaText).map((r, i) => {
    const fail = (m: string): never => {
      throw new Error(`data/${SERIES} line ${i + 2} (${r.id || 'no id'}): ${m}`);
    };
    if (!r.id || seen.has(r.id)) fail('id is missing or repeated');
    seen.add(r.id);
    const p = pts.get(r.id) ?? fail(`no rows in ${POINTS}`);
    if (p.reconstructed.length < 50) fail('needs at least 50 reconstructed points');
    if (r.axis !== 'year' && r.axis !== 'years_ago') fail('axis must be year or years_ago');
    for (const k of ['title', 'unit', 'source', 'measured_label', 'reconstructed_label'] as const) if (!r[k]) fail(`${k} is empty`);
    for (const k of ['source_url', 'landing_url'] as const) if (!/^https:\/\//.test(r[k] ?? '')) fail(`${k} must be an https link`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked)) fail('checked must be YYYY-MM-DD');

    let measured = p.measured;
    let dashboardFrom: number | null = null;
    if (r.live_indicator) {
      const s = live.get(r.live_indicator) ?? fail(`live_indicator "${r.live_indicator}" is not in data/indicators.csv`);
      const pointsIn = s.points;
      const years = new Map<number, number[]>();
      for (const q of pointsIn) {
        const y = Number(q.date.slice(0, 4));
        years.set(y, [...(years.get(y) ?? []), q.value]);
      }
      const monthly = pointsIn.length > years.size * 2;
      // The dashboard sparkline shows the last 30 years of a monthly series, or all of a yearly one.
      dashboardFrom = monthly ? Number(pointsIn[Math.max(0, pointsIn.length - 360)].date.slice(0, 4)) : Number(pointsIn[0].date.slice(0, 4));
      // Only the CO2 live record shares the reconstruction's unit; temperature uses a different baseline,
      // so for it the study's own measured line is kept and the live card is only linked.
      if (r.id === 'co2') {
        measured = [...years.entries()]
          .filter(([, v]) => !monthly || v.length === 12)
          .map(([year, v]) => ({ year, value: Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 100) / 100, low: null, high: null }));
      }
    }
    const sort = (a: LongPoint, b: LongPoint) => a.year - b.year;
    return {
      id: r.id,
      order: Number(r.order) || i,
      title: r.title,
      unit: r.unit,
      axis: r.axis as LongSeries['axis'],
      measuredLabel: r.measured_label,
      reconstructedLabel: r.reconstructed_label,
      measured: measured.sort(sort),
      reconstructed: p.reconstructed.sort(sort),
      dashboardFrom,
      liveIndicator: r.live_indicator || null,
      source: { name: r.source, url: r.source_url, landing: r.landing_url },
      note: r.note ?? '',
      checked: r.checked,
    };
  });
  for (const id of pts.keys()) if (!seen.has(id)) throw new Error(`data/${POINTS}: series "${id}" has no entry in ${SERIES}`);
  return out.sort((a, b) => a.order - b.order).map(({ order: _o, ...s }) => s);
}
