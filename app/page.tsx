import { getDashboardData } from '@/lib/data';
import { BottlenecksPanel } from '@/components/dashboard/BottlenecksPanel';
import { TierTrendChart } from '@/components/dashboard/TierTrendChart';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { MeasuredIndicators } from '@/components/dashboard/MeasuredIndicators';
import { TierTiles } from '@/components/dashboard/TierTiles';
import { ForecastTeaser } from '@/components/dashboard/ForecastTeaser';
import { getIndicators } from '@/lib/indicators';
import { getRefreshStatus } from '@/lib/refresh';
import Link from 'next/link';
import { NextStep } from '@/components/site/NextStep';
import { SubscribeBox } from '@/components/report/SubscribeBox';
import { SUBSTACK_URL } from '@/lib/site';

// Built once per deploy: CSVs are read at build time. Updating data = commit new CSVs -> Vercel redeploys.
export const dynamic = 'force-static';

const list = (names: string[]) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

export default async function DashboardPage() {
  const [data, indicators, refresh] = await Promise.all([getDashboardData(), getIndicators(), getRefreshStatus()]);
  const by = (status: string) => data.tiers.filter((t) => t.status === status).map((t) => t.name);
  const improving = by('Improving');
  const degrading = by('Degrading');

  return (
    <>
      <section className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
        <div className="flex flex-col justify-center gap-4">
          <h1>Four areas, one check&#8209;up.</h1>
          <p className="max-w-xl text-lg text-muted">
            Scores from 0 to 100, built from {indicators.length} measured indicators.
            {improving.length > 0 && <> Improving over 5 years: {list(improving)}.</>}
            {degrading.length > 0 && <> Getting worse: {list(degrading)}.</>}
          </p>
          <TierTiles tiers={data.tiers} />
          <Link href="/report" className="w-fit text-sm font-semibold text-accent hover:underline">
            Read this month&apos;s Brief: the numbers in one short read &rarr;
          </Link>
          {SUBSTACK_URL && (
            <a href={SUBSTACK_URL} target="_blank" rel="noopener noreferrer" className="w-fit text-sm text-muted hover:text-accent hover:underline print:hidden">
              Get the monthly Brief by email &rarr;
            </a>
          )}
        </div>
        <TierTrendChart data={data.tierTrend} tiers={data.tiers} />
      </section>

      <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <BottlenecksPanel bottlenecks={data.bottlenecks} tiers={data.tiers} />
        <div className="flex flex-col gap-6">
          <AlertsPanel alerts={data.alerts} checked={data.alertsChecked} tiers={data.tiers} />
          <ForecastTeaser />
        </div>
      </section>

      <MeasuredIndicators indicators={indicators} tiers={data.tiers} refresh={refresh} />

      <SubscribeBox title="Get the monthly EarthOS Brief by email" />

      <NextStep from="/" />
    </>
  );
}
