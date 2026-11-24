import { OPEN_HEADERS, seriesIds, seriesJson } from '@/lib/openData';

export const dynamic = 'force-static';
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await seriesIds()).map((id) => ({ file: `${id}.json` }));
}

/** /data/series/<indicator id>.json: one indicator's full history. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const body = file.endsWith('.json') ? await seriesJson(file.slice(0, -5)) : null;
  if (!body) return new Response('Not found', { status: 404 });
  return new Response(JSON.stringify(body, null, 2), {
    headers: { ...OPEN_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
