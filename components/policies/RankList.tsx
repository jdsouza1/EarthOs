import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

export interface RankMetric {
  label: string;
  /** Shown to the right of the bar. */
  value: ReactNode;
  /** Bar length, 0 to 100. */
  pct: number;
  /** accent for scores, muted for sizes. */
  tone?: 'accent' | 'muted';
  /** Optional target line, 0 to 100. */
  marker?: number;
  title?: string;
}

export interface RankRow {
  key: string;
  name: string;
  href?: string;
  metrics: RankMetric[];
  badge?: { text: string; cls: string };
  /** One line under the name; the full text is on the country page. */
  note?: string;
  steps?: number;
}

function Bar({ m }: { m: RankMetric }) {
  return (
    <div className="flex items-center gap-3" title={m.title}>
      <span className="sr-only">{m.label}: </span>
      <div className="relative h-2 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${m.tone === 'muted' ? 'bg-subtle' : 'bg-accent'}`} style={{ width: `${Math.max(Math.min(m.pct, 100), 1)}%` }} />
        {m.marker != null && <div className="absolute inset-y-0 w-0.5 bg-ink-2" style={{ left: `${m.marker}%` }} />}
      </div>
      <span className="w-24 shrink-0 whitespace-nowrap text-right font-mono text-xs text-body">{m.value}</span>
    </div>
  );
}

/** A compact ranked list: one row per country, bars instead of cards. Each row opens the country's gameplan. */
export function RankList({ title, legend, rows, footer }: { title: string; legend: ReactNode; rows: RankRow[]; footer?: ReactNode }) {
  return (
    <section className="panel flex flex-col p-5" aria-labelledby={`rank-${title}`}>
      <h2 id={`rank-${title}`} className="eyebrow">{title}</h2>
      <div className="mb-2 mt-1 text-xs text-subtle">{legend}</div>
      <ul className="flex flex-col">
        {rows.map((r) => {
          const body = (
            <>
              <div className="min-w-0">
                <span className="block text-[15px] font-semibold text-ink">{r.name}</span>
                {r.note && (
                  <span className="block truncate text-xs text-subtle" title={r.note}>
                    {r.note}
                  </span>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                {r.metrics.map((m) => (
                  <Bar key={m.label} m={m} />
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 md:justify-end">
                {r.badge && <span className={`tag whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${r.badge.cls}`}>{r.badge.text}</span>}
                {r.href && (
                  <span className="flex items-center gap-0.5 text-xs text-accent">
                    <span className="md:sr-only">{r.steps ? `${r.steps}-step gameplan` : 'Details'}</span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </span>
                )}
              </div>
            </>
          );
          const cls = 'grid grid-cols-1 gap-2 border-t border-line py-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] md:items-center md:gap-5';
          return (
            <li key={r.key}>
              {r.href ? (
                <Link
                  href={r.href}
                  aria-label={`${r.name}${r.steps ? `: ${r.steps}-step gameplan` : ''}`}
                  className={`${cls} -mx-2 rounded-lg px-2 transition-colors hover:bg-inset focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
                >
                  {body}
                </Link>
              ) : (
                <div className={cls}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {footer && <div className="mt-3 text-xs text-subtle">{footer}</div>}
    </section>
  );
}
