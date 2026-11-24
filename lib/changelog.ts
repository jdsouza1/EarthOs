import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

export type ChangeType = 'data' | 'method' | 'decision' | 'site';
const TYPES: ChangeType[] = ['data', 'method', 'decision', 'site'];

export interface ChangeEntry {
  date: string; // YYYY-MM-DD
  type: ChangeType;
  title: string;
  detail: string;
  affects: string;
}

const FILE = 'changelog.csv';

/** Newest first. Within a day, later rows in the file are newer. Bad rows fail the build. */
export async function getChangelog(): Promise<ChangeEntry[]> {
  const rows = parseCsv(await readFile(path.join(process.cwd(), 'data', FILE), 'utf8'));
  const entries = rows.map((r, i) => {
    const line = i + 2;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date) || Number.isNaN(new Date(r.date).getTime()))
      throw new Error(`data/${FILE} line ${line}: date must be YYYY-MM-DD, got "${r.date}"`);
    if (!TYPES.includes(r.type as ChangeType))
      throw new Error(`data/${FILE} line ${line}: type must be ${TYPES.join('/')}, got "${r.type}"`);
    if (!r.title) throw new Error(`data/${FILE} line ${line}: title is empty`);
    return { order: i, entry: { date: r.date, type: r.type as ChangeType, title: r.title, detail: r.detail ?? '', affects: r.affects ?? '' } };
  });
  return entries
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.order - a.order)
    .map((e) => e.entry);
}
