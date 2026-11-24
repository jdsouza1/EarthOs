import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'levers.csv';

export interface Lever {
  indicatorId: string;
  lever: string;
  who: string[];
  evidence: string;
  source: string;
  sourceUrl: string;
}

/** Levers from data/levers.csv. Each must name who can act and a source; bad rows fail the build. */
export async function getLevers(): Promise<Map<string, Lever[]>> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return new Map();
    throw e;
  }
  const out = new Map<string, Lever[]>();
  parseCsv(text).forEach((r, i) => {
    const line = i + 2;
    for (const col of ['indicator_id', 'lever', 'who', 'source', 'source_url']) {
      if (!r[col]) throw new Error(`data/${FILE} line ${line}: ${col} is empty`);
    }
    if (!/^https:\/\//.test(r.source_url)) throw new Error(`data/${FILE} line ${line}: source_url must start with https://`);
    const lever: Lever = {
      indicatorId: r.indicator_id,
      lever: r.lever,
      who: r.who.split(';').map((s) => s.trim()).filter(Boolean),
      evidence: r.evidence ?? '',
      source: r.source,
      sourceUrl: r.source_url,
    };
    out.set(r.indicator_id, [...(out.get(r.indicator_id) ?? []), lever]);
  });
  return out;
}
