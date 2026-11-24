import { ImageResponse } from 'next/og';
import { getIndicators } from '@/lib/indicators';
import { getRefreshStatus, formatDay } from '@/lib/refresh';
import { dark } from '@/lib/tokens';
import { formatDelta, formatPeriod, formatValue } from '@/lib/format';
import { sparkPath } from '@/lib/embed';

export const dynamic = 'force-static';
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getIndicators()).map((i) => ({ id: i.id }));
}

/** 1200 × 630 picture of an indicator card: the link preview on LinkedIn and others, and the "Download image" button. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [indicators, refresh] = await Promise.all([getIndicators(), getRefreshStatus()]);
  const ind = indicators.find((i) => i.id === id);
  if (!ind) return new Response('Not found', { status: 404 });

  const tier = dark[`tier-${ind.tierId}`];
  const { line, area } = sparkPath(ind.spark, 1040, 200, 6);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="200" viewBox="0 0 1040 200"><path d="${area}" fill="${tier}" fill-opacity="0.16"/><path d="${line}" fill="none" stroke="${tier}" stroke-width="4"/></svg>`;
  const changes = [ind.change1y !== null ? `1 year ${formatDelta(ind.change1y)}` : '', ind.change10y !== null ? `10 years ${formatDelta(ind.change10y)}` : '']
    .filter(Boolean)
    .join('   ·   ');
  const checked = refresh ? `Checked ${formatDay(refresh.last.checkedAt)}` : `Downloaded ${formatDay(ind.retrievedAt)}`;

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: dark.canvas, padding: '56px 80px', color: dark.ink }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 30, color: dark.subtle }}>
          <span style={{ display: 'flex', color: dark['ink-2'], fontSize: 38, fontWeight: 700 }}>{ind.name}</span>
          <span style={{ display: 'flex' }}>EarthOS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginTop: 24 }}>
          <span style={{ display: 'flex', fontSize: 120, fontWeight: 700, color: tier, lineHeight: 1 }}>{formatValue(ind.latest.value)}</span>
          <span style={{ display: 'flex', fontSize: 36, color: dark.muted, marginLeft: 20 }}>{ind.unit}</span>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: dark.subtle, marginTop: 14 }}>
          {`${formatPeriod(ind.latest.date, ind.annual)}${changes ? `   ·   ${changes}` : ''}`}
        </div>
        <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`} width={1040} height={200} style={{ marginTop: 'auto' }} alt="" />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, color: dark.subtle, marginTop: 22 }}>
          <span style={{ display: 'flex' }}>{`Source: ${ind.source}`}</span>
          <span style={{ display: 'flex' }}>{checked}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600' } },
  );
}
