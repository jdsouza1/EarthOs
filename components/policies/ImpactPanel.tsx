import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { InfoTip } from '@/components/ui/InfoTip';
import type { Confidence, ImpactBlock, ImpactItem } from '@/lib/impact';

const CONF_LABEL: Record<Confidence, string> = {
  measured: 'Measured',
  modelled: 'Modelled',
  expert: 'Expert judgement',
};

const BLOCKS: { key: Exclude<ImpactBlock, 'timeline'>; title: string }[] = [
  { key: 'why', title: 'Why it matters' },
  { key: 'worst', title: 'Worst case' },
  { key: 'survival', title: "Impact on humanity's survival" },
  { key: 'best', title: 'Best case' },
  { key: 'disagree', title: 'Where experts disagree' },
  { key: 'knockon', title: 'Knock-on effects' },
  { key: 'affected', title: 'Who is affected' },
];

function Source({ item }: { item: ImpactItem }) {
  return (
    <p className="mt-1 text-[11px] text-subtle">
      <span className="text-subtle">{CONF_LABEL[item.confidence]}</span> ·{' '}
      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
        {item.sourceName}
      </a>
    </p>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function Row({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <details className="group border-t border-line first:border-t-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-[15px] font-semibold text-ink hover:text-accent-strong [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-subtle">
          {hint}
          <ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>
      <div className="pb-4">{children}</div>
    </details>
  );
}

/** The next milestone is the first timeline row whose date has not passed at build time. */
function nextIndex(items: ImpactItem[]): number {
  const today = new Date().toISOString().slice(0, 10);
  return items.findIndex((t) => t.dateIso >= today);
}

/** Why the topic matters, folded into rows that open on click. Every line names its source and confidence. */
export function ImpactPanel({ impact, leversHref = '/levers' }: { impact: Record<ImpactBlock, ImpactItem[]>; leversHref?: string }) {
  const total = Object.values(impact).reduce((n, a) => n + a.length, 0);
  if (total === 0) return null;
  const next = nextIndex(impact.timeline);

  return (
    <section className="flex flex-col gap-2" aria-labelledby="impact-title">
      <div className="flex items-center gap-1.5">
        <h2 id="impact-title" className="eyebrow">Impact</h2>
        <InfoTip id="impact-about" label="About the impact section" align="left">
          Every line names its source and says what kind of claim it is. Measured: counted or recorded. Modelled: the
          output of a published model, so it depends on the model&apos;s assumptions. Expert judgement: an estimate by
          named experts, shown as they gave it. EarthOS adds no estimates of its own.
        </InfoTip>
      </div>
      <div className="panel px-5 py-1">
        {BLOCKS.filter((b) => impact[b.key].length > 0).map((b) => (
          <Row key={b.key} title={b.title} hint={plural(impact[b.key].length, 'source', 'sources')}>
            <ul className="flex flex-col gap-3">
              {impact[b.key].map((it) => (
                <li key={`${it.block}-${it.order}`}>
                  <p className="text-sm text-body">{it.text}</p>
                  <Source item={it} />
                </li>
              ))}
            </ul>
          </Row>
        ))}
        {impact.timeline.length > 0 && (
          <Row title="Timeline" hint={plural(impact.timeline.length, 'date', 'dates')}>
            <ol className="flex flex-col gap-3 border-l border-line pl-4">
              {impact.timeline.map((t, i) => (
                <li key={`${t.dateIso}-${t.order}`} className="relative">
                  <span className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${i === next ? 'bg-accent' : 'bg-muted'}`} aria-hidden="true" />
                  <p className="text-sm text-body">
                    <b className="mr-2 font-mono text-xs text-ink-2">{t.label}</b>
                    {i === next && <span className="tag mr-2 text-accent">Next</span>}
                    {t.text}
                  </p>
                  <Source item={t} />
                </li>
              ))}
            </ol>
          </Row>
        )}
      </div>
      <p className="text-xs text-muted">
        Who can act on this:{' '}
        <Link href={leversHref} className="text-accent hover:underline">
          see the levers
        </Link>
        .
      </p>
    </section>
  );
}
