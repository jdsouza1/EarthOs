import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'indicator_info.csv';

/** Plain-English "what this measures" text from data/indicator_info.csv, keyed by indicator_id. */
export async function getIndicatorInfo(): Promise<Map<string, string>> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw e;
  }
  const out = new Map<string, string>();
  parseCsv(text).forEach((r, i) => {
    if (!r.indicator_id || !r.about) throw new Error(`data/${FILE} line ${i + 2}: indicator_id and about are required`);
    out.set(r.indicator_id, r.about);
  });
  return out;
}
