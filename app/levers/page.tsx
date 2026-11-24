import type { Metadata } from 'next';
import Link from 'next/link';
import { computeScores } from '@/lib/scores';
import { getLevers } from '@/lib/levers';
import { getDashboardData } from '@/lib/data';
import { TIER_THEME } from '@/components/dashboard/theme';
import { PageHeader } from '@/components/site/PageHeader';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Levers — EarthOS' };

const BASIS = { target: 'vs target', limit: 'vs limit', trend: '10-yr trend' } as const;

function scoreClass(score: number) {
  if (score < 15) return 'border-critical-line bg-critical-bg/40 text-critical';
  if (score < 35) return 'border-elevated-line bg-elevated-bg/40 text-elevated';
  if (score < 60) return 'border-warning-line bg-warning-bg/40 text-warning-text';
  return 'border-good-line bg-good-bg/40 text-good';
}

export default async function LeversPage() {
  const [scores, levers, dash] = await Promise.all([computeScores(), getLevers(), getDashboardData()]);
  const tierName = new Map(dash.tiers.map((t) => [t.id, t.name]));
  const indicators = [...(scores?.indicators ?? [])].sort((a, b) => a.score - b.score);
  const researched = indicators.filter((i) => levers.has(i.id));
  const pending = indicators.filter((i) => !levers.has(i.id));

  const lever = (ind: (typeof researched)[number]) => {
    const theme = TIER_THEME[ind.tierId];
    return (
      <section key={ind.id} className="panel p-5" aria-labelledby={`lever-${ind.id}`}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className={`text-sm font-semibold ${theme.text}`}>{tierName.get(ind.tierId) ?? ind.tierId}</div>
            <h2 id={`lever-${ind.id}`} className="eyebrow">{ind.name}</h2>
          </div>
          <span className={`rounded-md border px-2 py-0.5 font-mono text-sm ${scoreClass(ind.score)}`} title={`Score out of 100, ${BASIS[ind.basis]}`}>
            {Math.round(ind.score)} / 100
          </span>
        </div>
        <ol className="grid gap-3 md:grid-cols-2">
          {levers.get(ind.id)!.map((l) => (
            <li key={l.lever} className="card flex flex-col gap-2 p-4">
              <p className="text-[15px] font-semibold text-ink">{l.lever}</p>
              <p className="text-sm text-muted">
                <span className="text-subtle">Who: </span>
                {l.who.join('; ')}
              </p>
              {l.evidence && (
                <details className="group text-sm">
                  <summary className="cursor-pointer list-none text-accent hover:underline [&::-webkit-details-marker]:hidden">
                    <span className="group-open:hidden">Why this works</span>
                    <span className="hidden group-open:inline">Hide evidence</span>
                  </summary>
                  <p className="mt-1 text-muted">{l.evidence}</p>
                </details>
              )}
              <a href={l.sourceUrl} target="_blank" rel="noreferrer" className="mt-auto pt-1 text-xs text-subtle hover:text-accent hover:underline">
                Source: {l.source}
              </a>
            </li>
          ))}
        </ol>
      </section>
    );
  };
  const SHOWN = 4;

  return (
    <>
      <PageHeader
        label="Levers"
        title="What would move the weakest numbers."
        summary="Each lever names who can act and the evidence behind it, weakest indicator first. EarthOS does not rate or recommend governments itself."
      >
        <p className="text-xs text-subtle">
          <Link href="/funding" className="text-accent hover:underline">What closing the gaps would cost →</Link>
        </p>
      </PageHeader>

      {researched.slice(0, SHOWN).map(lever)}

      {researched.length > SHOWN && (
        <details className="group flex flex-col gap-6">
          <summary className="panel cursor-pointer list-none p-5 text-[15px] font-semibold text-accent hover:underline [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">Show {researched.length - SHOWN} more indicators with levers</span>
            <span className="hidden group-open:inline">Show fewer</span>
          </summary>
          <div className="mt-6 flex flex-col gap-6">{researched.slice(SHOWN).map(lever)}</div>
        </details>
      )}

      {pending.length > 0 && (
        <section className="panel p-5">
          <h2 className="eyebrow mb-1">Not yet researched</h2>
          <p className="mb-3 text-sm text-muted">
            These indicators score better today, so they come later. See them on the <Link href="/" className="text-accent hover:underline">dashboard</Link>.
          </p>
          <ul className="flex flex-wrap gap-2">
            {pending.map((i) => (
              <li key={i.id} className={`rounded-md border px-2 py-0.5 text-xs ${scoreClass(i.score)}`}>
                {i.name} · {Math.round(i.score)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
