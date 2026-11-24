import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'policy_food.csv';

export interface FoodCountry {
  iso3: string;
  country: string;
  /** 2026 Global Hunger Index score, 0 to 100 (lower is better). */
  ghiScore: number;
  /** Rank among the 122 countries ranked (higher rank number = more hunger). */
  ghiRank: number;
  /** The four component indicators, each a percentage. */
  undernourishment: number;
  stunting: number;
  wasting: number;
  mortality: number;
  note: string;
}

/** Severity bands published by the Global Hunger Index. */
export function severity(score: number): string {
  if (score >= 50) return 'Extremely alarming';
  if (score >= 35) return 'Alarming';
  if (score >= 20) return 'Serious';
  if (score >= 10) return 'Moderate';
  return 'Low';
}

/** Standardisation thresholds the index uses to put each indicator on a 0 to 100 scale. */
export const THRESHOLDS = { undernourishment: 80, stunting: 70, wasting: 30, mortality: 35 } as const;

/** The 15 highest-scoring countries in the 2026 index, highest score first. */
export async function getFood(): Promise<FoodCountry[]> {
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
    const pct = (k: string) => {
      const v = Number(r[k]);
      if (!(v >= 0 && v <= 100)) fail(`${k} must be 0 to 100`);
      return v;
    };
    const ghiRank = Number(r.ghi_rank);
    if (!Number.isInteger(ghiRank) || ghiRank < 1 || ghiRank > 122) fail('ghi_rank must be 1 to 122');
    return {
      iso3: r.iso3,
      country: r.country,
      ghiScore: pct('ghi_score'),
      ghiRank,
      undernourishment: pct('undernourishment'),
      stunting: pct('stunting'),
      wasting: pct('wasting'),
      mortality: pct('mortality'),
      note: r.note ?? '',
    };
  });
  return out.sort((a, b) => b.ghiScore - a.ghiScore || a.country.localeCompare(b.country));
}
