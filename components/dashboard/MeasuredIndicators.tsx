import Link from 'next/link';
import type { Indicator } from '@/lib/indicators';
import type { TierSnapshot } from '@/lib/types';
import { IndicatorCard } from './IndicatorCard';
import { TIER_THEME } from './theme';

/**
 * Real, downloaded data, grouped by tier. Unlike the tier scores above it, nothing here is illustrative.
 * Shows a waiting state until the first ingest run creates data/indicators.csv.
 */
export function MeasuredIndicators({ indicators, tiers }: { indicators: Indicator[]; tiers: TierSnapshot[] }) {
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
        {latestRetrieval && <span className="tag text-subtle">Downloaded {latestRetrieval}</span>}
      </div>
      <p className="mb-4 max-w-3xl text-xs text-muted">
        Measurements from named sources, shown as published. Each is scored 0–100 and averaged into its area score above. <Link href="/methodology" className="text-accent hover:underline">How this works</Link>
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
        <div className="flex flex-col gap-5">
          {byTier.map(({ tier, items }) => (
            <div key={tier.id} id={`tier-${tier.id}`} className="scroll-mt-6">
              <h3 className={`eyebrow mb-2 ${TIER_THEME[tier.id].text}`}>{tier.name}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((ind) => (
                  <IndicatorCard key={ind.id} ind={ind} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
