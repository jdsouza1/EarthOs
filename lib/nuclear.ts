import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'policy_nuclear.csv';

export interface NuclearCountry {
  iso3: string;
  country: string;
  /** Nuclear Threat Initiative Nuclear Security Index overall score, 2026 edition (higher is better). */
  ntiScore: number;
  /** Change since the 2023 edition, in points. */
  ntiChange: number;
  /** Rank among the 22 countries with weapons-usable nuclear materials (1 = best). */
  ntiRank: number;
  /** SIPRI estimate of the military stockpile (warheads available for use), January 2026. */
  stockpile: number;
  /** SIPRI estimate including retired warheads awaiting dismantling. */
  totalInventory: number;
  note: string;
}

/** The nine nuclear-armed countries, lowest security score first. */
export async function getNuclear(): Promise<NuclearCountry[]> {
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
    const ntiScore = Number(r.nti_score);
    const ntiChange = Number(r.nti_change_2023);
    const ntiRank = Number(r.nti_rank);
    const stockpile = Number(r.stockpile);
    const totalInventory = Number(r.total_inventory);
    if (!r.iso3 || !r.country) throw new Error(`data/${FILE} line ${line}: iso3 and country are required`);
    if (seen.has(r.iso3)) throw new Error(`data/${FILE} line ${line}: ${r.iso3} appears twice`);
    seen.add(r.iso3);
    if (!(ntiScore >= 0 && ntiScore <= 100)) throw new Error(`data/${FILE} line ${line}: nti_score must be 0 to 100`);
    if (!Number.isFinite(ntiChange)) throw new Error(`data/${FILE} line ${line}: nti_change_2023 must be a number`);
    if (!Number.isInteger(ntiRank) || ntiRank < 1 || ntiRank > 22) throw new Error(`data/${FILE} line ${line}: nti_rank must be 1 to 22`);
    if (!(stockpile >= 0) || !(totalInventory >= stockpile)) throw new Error(`data/${FILE} line ${line}: total_inventory must be at least stockpile`);
    return { iso3: r.iso3, country: r.country, ntiScore, ntiChange, ntiRank, stockpile, totalInventory, note: r.stockpile_note ?? '' };
  });
  return out.sort((a, b) => a.ntiScore - b.ntiScore || a.country.localeCompare(b.country));
}
