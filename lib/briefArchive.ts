import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { BRIEF_VERSION, type BriefData } from './brief';

/** Saved monthly issues of the Brief (data/briefs/YYYY-MM.json). A bad file stops the build. */
const DIR = path.join(process.cwd(), 'data', 'briefs');
const KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;

export async function listIssues(): Promise<string[]> {
  let files: string[];
  try {
    files = await readdir(DIR);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
  const keys = files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  for (const k of keys) if (!KEY.test(k)) throw new Error(`data/briefs/${k}.json: file name must be YYYY-MM.json`);
  return keys.sort().reverse();
}

export async function getIssue(key: string): Promise<BriefData> {
  if (!KEY.test(key)) throw new Error(`Not an issue key: ${key}`);
  const b = JSON.parse(await readFile(path.join(DIR, `${key}.json`), 'utf8')) as BriefData;
  if (b.key !== key) throw new Error(`data/briefs/${key}.json: its key says ${b.key}`);
  if (b.version !== BRIEF_VERSION) throw new Error(`data/briefs/${key}.json: version ${b.version}, the site reads version ${BRIEF_VERSION}`);
  if (!Array.isArray(b.tiers) || b.tiers.length === 0) throw new Error(`data/briefs/${key}.json: no tier scores`);
  return b;
}
