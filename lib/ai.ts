import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'policy_ai.csv';

export interface AiCountry {
  iso3: string;
  country: string;
  /** Global Index on Responsible AI (GIRAI) 2026 overall score, 0 to 100, higher is better. */
  index: number;
  /** GIRAI 2026 global rank out of 135. */
  rank: number;
  inclusion: number;
  ethics: number;
  labour: number;
  trust: number;
  public: number;
  note: string;
}

/** The five GIRAI dimensions, in GIRAI's order; each maps to the master-gameplan theme of the same key. */
export const DIMENSIONS = [
  { key: 'inclusion', label: 'Inclusion and Diversity', hint: 'Gender equality, children\'s rights, cultural and linguistic diversity.' },
  { key: 'ethics', label: 'Ethics and Sustainability', hint: 'Fairness, transparency, human oversight, environmental impact.' },
  { key: 'labour', label: 'Labour and Skills', hint: 'Labour protections, reskilling and upskilling, AI literacy.' },
  { key: 'trust', label: 'Trust and Safety', hint: 'Safety and security, redress, impact assessments, misinformation and violence.' },
  { key: 'public', label: 'AI Use in Public Service', hint: 'Public-sector skills, disclosure of government algorithms, procurement, civil society inclusion.' },
] as const;

export type DimensionKey = (typeof DIMENSIONS)[number]['key'];

/** The countries shown, lowest GIRAI score first. */
export async function getAi(): Promise<AiCountry[]> {
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
    const score = (k: string) => {
      const v = Number(r[k]);
      if (r[k] === '' || !(v >= 0 && v <= 100)) fail(`${k} must be 0 to 100`);
      return v;
    };
    const rank = Number(r.rank);
    if (!Number.isInteger(rank) || rank < 1) fail('rank must be a whole number from 1');
    return {
      iso3: r.iso3,
      country: r.country,
      index: score('index'),
      rank,
      inclusion: score('inclusion'),
      ethics: score('ethics'),
      labour: score('labour'),
      trust: score('trust'),
      public: score('public'),
      note: r.note ?? '',
    };
  });
  return out.sort((a, b) => b.rank - a.rank);
}
