import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'indicator_notes.csv';

/**
 * Short sourced notes shown on an indicator card (data/indicator_notes.csv): a newer published figure
 * that the data feed has not picked up yet, or a related number the card's series hides.
 * A note with until_year disappears by itself once the indicator's data reaches that year.
 */
export interface IndicatorNote {
  text: string;
  source: string;
  url: string;
  untilYear: number | null;
}

export async function getIndicatorNotes(): Promise<Map<string, IndicatorNote>> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw e;
  }
  const out = new Map<string, IndicatorNote>();
  parseCsv(text).forEach((r, i) => {
    const fail = (m: string): never => {
      throw new Error(`data/${FILE} line ${i + 2}: ${m}`);
    };
    if (!r.indicator_id || !r.note || !r.source) fail('indicator_id, note and source are required');
    if (!/^https:\/\//.test(r.source_url ?? '')) fail('source_url must be an https link');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked ?? '')) fail('checked must be YYYY-MM-DD');
    if (r.until_year && !/^\d{4}$/.test(r.until_year)) fail('until_year must be a year');
    if (out.has(r.indicator_id)) fail('one note per indicator');
    out.set(r.indicator_id, { text: r.note, source: r.source, url: r.source_url, untilYear: r.until_year ? Number(r.until_year) : null });
  });
  return out;
}
