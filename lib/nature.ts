import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'policy_nature.csv';

export interface NatureCountry {
  iso3: string;
  country: string;
  /** Yale/Columbia Environmental Performance Index 2026, Biodiversity & Habitat issue category score, 0 to 100 (higher is better). */
  epiScore: number;
  /** Change over the past 10 years, in points. */
  epiChange: number;
  /** Rank among the 177 countries scored (1 = best). */
  epiRank: number;
  /** Five land-based indicator scores inside that category, each 0 to 100. */
  tbn: number;
  shi: number;
  rli: number;
  bhi: number;
  beri: number;
  note: string;
}

/** The megadiverse countries the index scores, lowest Biodiversity & Habitat score first. */
export async function getNature(): Promise<NatureCountry[]> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  const seen = new Set<string>();
  const out = parseCsv(text).map((r, i) => {
    const line = i + 2;
    const fail = (msg: string): never => {
      throw new Error(`data/${FILE} line ${line}: ${msg}`);
    };
    if (!r.iso3 || !r.country) fail('iso3 and country are required');
    if (seen.has(r.iso3)) fail(`${r.iso3} appears twice`);
    seen.add(r.iso3);
    const n = (k: string) => Number(r[k]);
    const score = (k: string) => {
      if (!(n(k) >= 0 && n(k) <= 100)) fail(`${k} must be 0 to 100`);
      return n(k);
    };
    const epiScore = score('epi_score');
    const epiChange = n('epi_change_10y');
    const epiRank = n('epi_rank');
    if (!Number.isFinite(epiChange)) fail('epi_change_10y must be a number');
    if (!Number.isInteger(epiRank) || epiRank < 1 || epiRank > 177) fail('epi_rank must be 1 to 177');
    return { iso3: r.iso3, country: r.country, epiScore, epiChange, epiRank, tbn: score('tbn'), shi: score('shi'), rli: score('rli'), bhi: score('bhi'), beri: score('beri'), note: r.note ?? '' };
  });
  return out.sort((a, b) => a.epiScore - b.epiScore || a.country.localeCompare(b.country));
}
