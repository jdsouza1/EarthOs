// Saves this month's Brief to data/briefs/YYYY-MM.json, building the archive behind /report.
// Run from the project folder (the monthly refresh does this after downloading new data):
//   node --experimental-strip-types --no-warnings --import ./scripts/ts-register.mjs scripts/snapshot-brief.ts [YYYY-MM]
// The month is the month of the run (UTC) unless given. Re-running in the same month replaces that month's file.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildBrief } from '../lib/brief';

const arg = process.argv[2];
const key = arg ?? new Date().toISOString().slice(0, 7);
if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) throw new Error(`Month must be YYYY-MM, got ${key}`);
const brief = await buildBrief(key);
const dir = path.join(process.cwd(), 'data', 'briefs');
await mkdir(dir, { recursive: true });
await writeFile(path.join(dir, `${key}.json`), `${JSON.stringify(brief, null, 2)}\n`);
console.log(`Saved the Brief for ${brief.issueLabel}: data/briefs/${key}.json`);
