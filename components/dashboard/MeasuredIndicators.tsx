import Link from 'next/link';
import type { Indicator } from '@/lib/indicators';
import type { TierSnapshot } from '@/lib/types';
import { formatDay, type RefreshStatus } from '@/lib/refresh';
import { IndicatorGroups } from './IndicatorGroups';

/**
 * Real, downloaded data, grouped by tier. Unlike the tier scores above it, nothing here is illustrative.
 * Shows a waiting state until the first ingest run creates data/indicators.csv.
 */
export function MeasuredIndicators({ indicators, tiers, refresh }: { indicators: Indicator[]; tiers: TierSnapshot[]; refresh: RefreshStatus | null }) {
  const byTier = tiers
    .map((t) => ({ tier: t, items: indicators.filter((i) => i.tierId === t.id).sort((a, b) => a.name.localeCompare(b.name)) }))
    .filter((g) => g.items.length > 0);
  const latestRetrieval = indicators.map((i) => i.retrievedAt).sort().at(-1);

  return (
    <section className="panel p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="eyebrow">Measured indicators</h2>
          <span className="tag rounded border border-good-line bg-good-bg/40 px-1.5 py-0.5 text-good">Real data</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {refresh ? (
            <span className="tag text-subtle" title={`Newest data downloaded ${latestRetrieval ? formatDay(latestRetrieval) : 'not yet'}. ${refresh.last.updated} of ${refresh.last.checked} sources had new numbers at the last check.`}>
              Checked {formatDay(refresh.last.checkedAt)}
            </span>
          ) : (
            latestRetrieval && <span className="tag text-subtle">Downloaded {formatDay(latestRetrieval)}</span>
          )}
          {refresh && refresh.last.failed.length > 0 && (
            <span className="tag rounded border border-warning-line bg-warning-bg/40 px-1.5 py-0.5 text-warning-text" title={`Not reached at the last check: ${refresh.last.failed.join(', ')}. Their previous numbers are still shown.`}>
              {refresh.last.failed.length} source{refresh.last.failed.length === 1 ? '' : 's'} not reached
            </span>
          )}
        </div>
      </div>
      <p className="mb-4 max-w-3xl text-xs text-muted">
        Measurements from named sources, shown as published. Each is scored 0–100 and averaged into its area score above.{refresh && <> Every source is checked automatically each month; next check {formatDay(refresh.nextCheck)}.</>} <Link href="/methodology" className="text-accent hover:underline">How this works</Link>
      </p>

      {byTier.length === 0 ? (
        <div className="card border-dashed p-6 text-center">
          <div className="tag mb-1 text-muted">Awaiting first data download</div>
          <p className="text-xs text-subtle">
            Fifteen sources across all four tiers are ready, from CO2 and warheads to poverty, internet use and life expectancy.
            They appear here after the first ingest run.
          </p>
        </div>
      ) : (
        <IndicatorGroups groups={byTier.map(({ tier, items }) => ({ id: tier.id, name: tier.name, items }))} />
      )}
    </section>
  );
}
