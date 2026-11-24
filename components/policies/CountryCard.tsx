import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PolicyRating } from '@/lib/policies';
import { formatShare } from '@/lib/emissions';
import { RATING, formatDate, slug } from './rating';

/** One country's rating; the whole card links to its gameplan. */
export function CountryCard({ p, steps, maxShare }: { p: PolicyRating; steps: number; maxShare: number }) {
  const style = RATING[p.rating];
  return (
    <Link
      href={`/policies/${slug(p.iso3)}`}
      className="card group flex flex-col overflow-hidden transition-colors hover:border-line-strong focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
    >
      <div className={`h-1 w-full ${style.bar}`} />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold text-ink">{p.country}</h3>
          <span className="font-mono text-[10px] text-subtle">{p.iso3}</span>
        </div>
        <span className={`tag self-start rounded border px-2 py-0.5 ${style.cls}`}>{p.rating}</span>
        <p className="text-xs text-muted">{style.world}.</p>
        {(p.actionRating || p.targetRating) && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px]">
            {p.targetRating && (<><dt className="text-subtle">Target</dt><dd className="text-body">{p.targetRating}</dd></>)}
            {p.actionRating && (<><dt className="text-subtle">Action</dt><dd className="text-body">{p.actionRating}</dd></>)}
          </dl>
        )}
        {p.emissions && (
          <div className="flex items-center gap-2" title={`${Math.round(p.emissions.mt).toLocaleString('en-US')} Mt CO2e in ${p.emissions.year}`}>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-muted" style={{ width: `${Math.max((p.emissions.share / maxShare) * 100, 1)}%` }} />
            </div>
            <span className="shrink-0 font-mono text-[10px] text-body">{formatShare(p.emissions.share)} of world emissions</span>
          </div>
        )}
        {p.note && <p className="text-xs text-body">{p.note}</p>}
        <div className="tag mt-auto flex items-center justify-between gap-2 pt-1 text-[9px]">
          <span className="text-subtle">Rated {formatDate(p.ratedOn)}</span>
          {steps > 0 && (
            <span className="flex items-center gap-1 text-accent group-hover:underline">
              {steps}-step gameplan <ArrowRight size={10} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
