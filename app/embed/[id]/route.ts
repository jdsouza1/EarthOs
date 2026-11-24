import { getIndicators } from '@/lib/indicators';
import { getRefreshStatus } from '@/lib/refresh';
import { embedHtml } from '@/lib/embed';

export const dynamic = 'force-static';
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getIndicators()).map((i) => ({ id: i.id }));
}

/** An indicator card other sites can show in an iframe. Security headers for /embed are in next.config.ts. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [indicators, refresh] = await Promise.all([getIndicators(), getRefreshStatus()]);
  const ind = indicators.find((i) => i.id === id);
  if (!ind) return new Response('Not found', { status: 404 });
  return new Response(embedHtml(ind, refresh), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
