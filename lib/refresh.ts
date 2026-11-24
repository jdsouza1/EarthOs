import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

/** Day of the month the scheduled check runs. Must match the cron line in .github/workflows/refresh.yml. */
export const REFRESH_DAY = 2;

export interface RefreshRun {
  checkedAt: string; // YYYY-MM-DD
  trigger: 'scheduled' | 'manual';
  checked: number;
  updated: number;
  failed: string[];
}

export interface RefreshStatus {
  last: RefreshRun;
  nextCheck: string; // YYYY-MM-DD
}

const FILE = 'refresh.csv';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-22" -> "22 Nov 2026", without time zones or locales getting involved. */
export function formatDay(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function nextScheduled(after: string) {
  let [y, m] = after.split('-').map(Number);
  const d = Number(after.slice(8, 10));
  if (d >= REFRESH_DAY) {
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(REFRESH_DAY).padStart(2, '0')}`;
}

/** The latest data check written by scripts/ingest.py. Null before the first one; bad rows fail the build. */
export async function getRefreshStatus(): Promise<RefreshStatus | null> {
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
  const runs = parseCsv(text).map((r, i): RefreshRun => {
    const line = i + 2;
    const fail = (msg: string): never => { throw new Error(`data/${FILE} line ${line}: ${msg}`); };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked_at) || Number.isNaN(Date.parse(r.checked_at))) fail(`checked_at must be YYYY-MM-DD, got "${r.checked_at}"`);
    if (r.trigger !== 'scheduled' && r.trigger !== 'manual') fail(`trigger must be scheduled or manual, got "${r.trigger}"`);
    const checked = Number(r.sources_checked);
    const updated = Number(r.sources_updated);
    if (!Number.isInteger(checked) || checked < 1) fail('sources_checked must be a whole number above 0');
    if (!Number.isInteger(updated) || updated < 0 || updated > checked) fail('sources_updated must be between 0 and sources_checked');
    const failed = (r.sources_failed ?? '').split(';').map((s) => s.trim()).filter(Boolean);
    return { checkedAt: r.checked_at, trigger: r.trigger as RefreshRun['trigger'], checked, updated, failed };
  });
  const last = runs.at(-1);
  return last ? { last, nextCheck: nextScheduled(last.checkedAt) } : null;
}
