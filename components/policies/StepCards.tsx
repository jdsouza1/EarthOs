import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

export interface StepCard {
  theme: string;
  title: string;
  why: string;
  href?: string;
  /** Small line under the text, e.g. who needs it. */
  meta?: string;
}

function Card({ s, n }: { s: StepCard; n: number }) {
  const inner = (
    <>
      <span className="font-mono text-xs text-accent">Step {n}</span>
      <span className="text-base font-semibold text-ink">{s.title}</span>
      <span className="text-sm text-muted">{s.why}</span>
      {(s.meta || s.href) && (
        <span className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-subtle">{s.meta}</span>
          {s.href && <ArrowRight size={14} className="shrink-0 text-accent" aria-hidden="true" />}
        </span>
      )}
    </>
  );
  const cls = 'card flex h-full flex-col gap-1.5 p-4';
  return s.href ? (
    <Link href={s.href} className={`${cls} transition-colors hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent`}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/** The topic's gameplan as cards: the first few shown, the rest one click away. */
export function StepCards({ title, intro, steps, initial = 6, children }: { title: string; intro?: ReactNode; steps: StepCard[]; initial?: number; children?: ReactNode }) {
  const first = steps.slice(0, initial);
  const rest = steps.slice(initial);
  const grid = 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3';
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`steps-${title}`}>
      <div>
        <h2 id={`steps-${title}`} className="eyebrow">{title}</h2>
        {intro && <p className="mt-1 max-w-2xl text-xs text-subtle">{intro}</p>}
      </div>
      <ol className={grid}>
        {first.map((s, i) => (
          <li key={s.theme}>
            <Card s={s} n={i + 1} />
          </li>
        ))}
      </ol>
      {rest.length > 0 && (
        <details className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-accent hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show all {steps.length} steps</span>
            <span className="hidden group-open:inline">Show fewer steps</span>
          </summary>
          <ol start={initial + 1} className={`${grid} mt-3`}>
            {rest.map((s, i) => (
              <li key={s.theme}>
                <Card s={s} n={initial + i + 1} />
              </li>
            ))}
          </ol>
        </details>
      )}
      {children}
    </section>
  );
}
