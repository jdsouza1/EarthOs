import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';
import type { TierId } from './types';
import { AREA_LABEL } from './trackRecord';
import { loadIndicatorSeries } from './indicators';

/**
 * Published forecasts whose date has not passed yet (data/coming_due.csv). Same entry rules as the
 * track record, except the outcome is still to come. When the due year passes, the item shows as
 * "awaiting the outcome" until it is moved to track_record.csv with its published result.
 */
export interface ComingDue {
  id: string;
  order: number;
  area: TierId;
  title: string;
  who: string;
  published: string;
  dueYear: number;
  kind: 'value' | 'probability';
  forecast: string;
  low: number;
  high: number;
  unit: string;
  indicatorId: string | null;
  note: string;
  source: { name: string; url: string };
  checked: string;
  status: 'open' | 'awaiting_outcome';
}

const FILE = 'coming_due.csv';

export async function getComingDue(): Promise<ComingDue[]> {
  const [text, series] = await Promise.all([readFile(path.join(process.cwd(), 'data', FILE), 'utf8'), loadIndicatorSeries()]);
  const thisYear = new Date().getFullYear();
  const seen = new Set<string>();
  return parseCsv(text)
    .map((r, i) => {
      const fail = (msg: string): never => {
        throw new Error(`data/${FILE} line ${i + 2} (${r.id || 'no id'}): ${msg}`);
      };
      if (!r.id || seen.has(r.id)) fail('id is missing or repeated');
      seen.add(r.id);
      if (!(r.area in AREA_LABEL)) fail(`area must be one of ${Object.keys(AREA_LABEL).join(', ')}`);
      if (r.kind !== 'value' && r.kind !== 'probability') fail('kind must be value or probability');
      for (const k of ['title', 'who', 'forecast', 'unit', 'source'] as const) if (!r[k]) fail(`${k} is empty`);
      if (!/^https:\/\//.test(r.source_url ?? '')) fail('source_url must be an https link');
      if (!/^\d{4}(-\d{2})?$/.test(r.published)) fail('published must be YYYY or YYYY-MM');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked)) fail('checked must be YYYY-MM-DD');
      const dueYear = Number(r.due_year);
      const low = Number(r.forecast_low);
      const high = Number(r.forecast_high);
      if (!Number.isInteger(dueYear)) fail('due_year must be a year');
      if (!(Number(r.published.slice(0, 4)) <= dueYear)) fail('published must be before due_year');
      if (r.forecast_low === '' || r.forecast_high === '' || !Number.isFinite(low) || !Number.isFinite(high) || low > high) fail('forecast_low and forecast_high must be numbers, low first');
      if (r.indicator_id && !series.has(r.indicator_id)) fail(`indicator_id "${r.indicator_id}" is not in data/indicators.csv`);
      return {
        id: r.id,
        order: Number(r.order) || i,
        area: r.area as TierId,
        title: r.title,
        who: r.who,
        published: r.published,
        dueYear,
        kind: r.kind as ComingDue['kind'],
        forecast: r.forecast,
        low,
        high,
        unit: r.unit,
        indicatorId: r.indicator_id || null,
        note: r.note ?? '',
        source: { name: r.source, url: r.source_url },
        checked: r.checked,
        status: dueYear < thisYear ? ('awaiting_outcome' as const) : ('open' as const),
      };
    })
    .sort((a, b) => a.dueYear - b.dueYear || a.order - b.order);
}
