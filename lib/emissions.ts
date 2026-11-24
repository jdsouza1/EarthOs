import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'emissions.csv';

export interface Emissions {
  year: number;
  /** Greenhouse gas emissions in million tonnes CO2-equivalent, excluding land use. */
  mt: number;
  /** Percent of the world total for the same year. */
  share: number;
  source: string;
  sourceUrl: string;
}

/** Each country's greenhouse gas emissions and share of the world total, keyed by iso3. */
export async function getEmissions(): Promise<Map<string, Emissions>> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw e;
  }
  const out = new Map<string, Emissions>();
  parseCsv(text).forEach((r, i) => {
    const line = i + 2;
    const year = Number(r.year);
    const mt = Number(r.mt_co2e);
    const world = Number(r.world_mt_co2e);
    if (!r.iso3 || !Number.isInteger(year)) throw new Error(`data/${FILE} line ${line}: iso3 and year are required`);
    if (!(mt >= 0) || !(world > 0) || mt > world) throw new Error(`data/${FILE} line ${line}: mt_co2e must be between 0 and world_mt_co2e`);
    if (!/^https:\/\//.test(r.source_url)) throw new Error(`data/${FILE} line ${line}: source_url must start with https://`);
    if (out.has(r.iso3)) throw new Error(`data/${FILE} line ${line}: ${r.iso3} appears twice`);
    out.set(r.iso3, { year, mt, share: (mt / world) * 100, source: r.source, sourceUrl: r.source_url });
  });
  return out;
}

/** "29.5%", "0.21%", "<0.01%". */
export function formatShare(share: number) {
  if (share < 0.01) return '<0.01%';
  if (share < 1) return `${share.toFixed(2)}%`;
  return `${share.toFixed(1)}%`;
}
