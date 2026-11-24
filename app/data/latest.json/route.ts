import { latestJson, OPEN_HEADERS } from '@/lib/openData';

export const dynamic = 'force-static';

export async function GET() {
  return new Response(JSON.stringify(await latestJson(), null, 2), {
    headers: { ...OPEN_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
