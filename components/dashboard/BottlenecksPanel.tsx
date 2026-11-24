import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { Bottleneck, TierSnapshot } from '@/lib/types';
import { SEVERITY_THEME, TIER_THEME } from './theme';
import { InfoTip } from '@/components/ui/InfoTip';

/**
 * The lowest-scoring indicators: where humanity is furthest from its goals or heading the wrong way.
 * Each row opens to say what it measures and how it is scored.
 */
const BASIS_HELP = {
  target: 'Scored on progress toward the official target since its baseline year.',
  limit: 'Scored on how much room is left before the agreed limit.',
  trend: 'No numeric target, so scored on its 10-year direction (50 = flat).',
} as const;

export function BottlenecksPanel({ bottlenecks, tiers }: { bottlenecks: Bottleneck[]; tiers: TierSnapshot[] }) {
  const tierName = (id: Bottleneck['tierId']) => tiers.find((t) => t.id === id)?.name ?? id;

  return (
    <section className="panel flex flex-col p-5" aria-labelledby="weakest-title">
      <div className="flex items-center gap-1.5">
        <h2 id="weakest-title" className="eyebrow">Weakest points</h2>
        <InfoTip id="bottlenecks-about" label="About weakest points" align="left">
          The five indicators with the lowest scores, out of 100. 100 means the target is met or the trend is strongly improving. A score of 0 means
          no progress toward the target since its baseline year, not a reading of zero: the line under each name gives the actual figure.
          <span className="mt-1.5 block">
            <b className="text-critical">Critical</b> = below 15 · <b className="text-elevated">Elevated</b> = below 35 · <b className="text-warning-text">Warning</b> = 35 or more.
          </span>
        </InfoTip>
      </div>
      <p className="mb-2 mt-1 text-sm text-subtle">Lowest-scoring indicators. Tap one for what it measures.</p>

      <ol className="flex flex-col">
        {bottlenecks.map((b) => {
          const sev = SEVERITY_THEME[b.severity];
          const tier = TIER_THEME[b.tierId];
          return (
            <li key={b.name} className="border-t border-line first:border-t-0">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="w-5 shrink-0 font-mono text-sm text-subtle">{b.rank}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] text-ink">{b.name}</span>
                    {b.context && <span className="block text-xs text-subtle">{b.context}</span>}
                  </span>
                  <span className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-sm ${sev.border} ${sev.bg} ${sev.text}`} title={`${b.severity.toLowerCase()} · score out of 100`}>
                    {b.score}
                  </span>
                  <ChevronDown size={16} className="shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="mb-3 ml-8 flex flex-col gap-1 text-sm text-muted">
                  {b.about && <p>{b.about}</p>}
                  <p className="text-xs text-subtle">
                    <span className={tier.text}>{tierName(b.tierId)}</span> · {BASIS_HELP[b.basis]}
                  </p>
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm">
        <Link href="/levers" className="text-accent hover:underline">See who can move these numbers →</Link>
      </p>
    </section>
  );
}
