import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { OPEN_HEADERS } from '@/lib/openData';

export const dynamic = 'force-static';

/** The full history of every indicator, exactly as scripts/ingest.py saved it. */
export async function GET() {
  const csv = await readFile(path.join(process.cwd(), 'data', 'indicators.csv'), 'utf8');
  return new Response(csv, {
    headers: {
      ...OPEN_HEADERS,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="earthos-indicators.csv"',
    },
  });
}
