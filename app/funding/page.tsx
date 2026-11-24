import type { Metadata } from 'next';
import { NextStep } from '@/components/site/NextStep';
import Link from 'next/link';
import { PageHeader } from '@/components/site/PageHeader';
import { FundingCards } from '@/components/funding/FundingCards';
import { getBenchmarks, getFunding } from '@/lib/funding';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Funding — EarthOS' };

export default async function FundingPage() {
  const [areas, benchmarks] = await Promise.all([getFunding(), getBenchmarks()]);
  return (
    <>
      <PageHeader
        label="Funding"
        title="What it costs to close the gap."
        summary="For five areas EarthOS tracks: what the world spends now, what published sources say is needed, and what stands in the way besides money. Each area is measured differently, so they are never added together."
      >
        <p className="text-xs text-subtle">
          <Link href="/levers" className="text-accent hover:underline">Who can act on each →</Link>
          {' · '}
          <Link href="/what-if" className="text-accent hover:underline">Published scenarios →</Link>
        </p>
      </PageHeader>

      <FundingCards areas={areas} />

      <section className="panel p-5" aria-labelledby="scale-title">
        <h2 id="scale-title" className="eyebrow mb-1">For scale</h2>
        <p className="mb-4 max-w-3xl text-xs text-muted">Two other large yearly flows of money, from their own sources. They are shown for context only.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {benchmarks.map((b) => (
            <div key={b.id} className="card p-4">
              <p className="tag text-[10px] text-subtle">{b.title}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-ink-2">{b.text}</p>
              <p className="mt-2 text-xs text-muted">{b.note}</p>
              <a href={b.source.url} target="_blank" rel="noreferrer" className="tag mt-2 inline-block text-[10px] text-accent hover:underline">
                {b.source.name}
              </a>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-5" aria-labelledby="unpriced-title">
        <h2 id="unpriced-title" className="eyebrow mb-2">Not priced</h2>
        <p className="max-w-3xl text-xs text-muted">
          Armed conflict and nuclear weapons have no card. What stands in the way there is mainly political, and no source puts a price on
          closing those gaps. See{' '}
          <Link href="/levers" className="text-accent hover:underline">Levers</Link> for who can act and{' '}
          <Link href="/policies" className="text-accent hover:underline">Policies</Link> for how countries compare.
          Areas with no card yet, such as pandemics, clean water and plastics, are on{' '}
          <Link href="/not-covered" className="text-accent hover:underline">Not covered yet</Link>.
        </p>
        <h2 className="eyebrow mb-2 mt-5">How to read this page</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-5 text-xs text-muted">
          <li>The gap is worked out from the two published figures, or is the source&apos;s own &quot;extra needed&quot; figure. EarthOS adds no estimate of its own.</li>
          <li>Each figure is labelled: measured, modelled, pledged, a funder&apos;s own target, or an expert claim.</li>
          <li>Areas cover different kinds of money (private investment, aid, one government&apos;s budget), so there is no total.</li>
          <li>Outcomes appear only where the source itself states what the money would do.</li>
          <li>&quot;What else stands in the way&quot; is EarthOS&apos;s short reading of each source, not a ranking.</li>
        </ul>
      </section>

      <NextStep from="/funding" />
    </>
  );
}
