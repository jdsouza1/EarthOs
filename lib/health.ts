import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'policy_health.csv';

export interface HealthCountry {
  iso3: string;
  country: string;
  /** WHO/UNICEF estimates (WUENIC) for 2025, each a percentage. */
  dtp1: number;
  dtp3: number;
  mcv1: number;
  mcv2: number;
  note: string;
}

/** The four coverage measures, in schedule order, with the master-gameplan theme each one maps to. */
export const MEASURES = [
  { key: 'dtp1', short: 'first-dose DTP', theme: 'zerodose', label: 'First DTP dose', hint: 'Share of infants who got at least one dose of diphtheria, tetanus and pertussis vaccine. Those who did not are counted as zero-dose children.' },
  { key: 'dtp3', short: 'third-dose DTP', theme: 'complete', label: 'Third DTP dose', hint: 'Share of infants who completed the three-dose DTP series. Immunization Agenda 2030 target: 90%.' },
  { key: 'mcv1', short: 'first-dose measles', theme: 'measles1', label: 'First measles dose', hint: 'Share of infants who got a first dose of measles-containing vaccine. 95% is needed to prevent outbreaks.' },
  { key: 'mcv2', short: 'second-dose measles', theme: 'measles2', label: 'Second measles dose', hint: 'Share of children who got a second measles dose by the age in the national schedule. Immunization Agenda 2030 target: 90%.' },
] as const;

export type MeasureKey = (typeof MEASURES)[number]['key'];

/** The 15 countries with the lowest 2025 third-dose DTP coverage, lowest first. */
export async function getHealth(): Promise<HealthCountry[]> {
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
      if (r[k] === '' || !(v >= 0 && v <= 100)) fail(`${k} must be 0 to 100`);
      return v;
    };
    return { iso3: r.iso3, country: r.country, dtp1: pct('dtp1'), dtp3: pct('dtp3'), mcv1: pct('mcv1'), mcv2: pct('mcv2'), note: r.note ?? '' };
  });
  return out.sort((a, b) => a.dtp3 - b.dtp3 || a.country.localeCompare(b.country));
}
