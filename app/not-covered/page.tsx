import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/site/PageHeader';
import { COVER_KIND_LABEL, getNotCovered } from '@/lib/notCovered';
import { KindBadge } from '@/components/ui/KindBadge';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Not covered yet — EarthOS' };

export default async function NotCoveredPage() {
  const areas = await getNotCovered();
  return (
    <>
      <PageHeader
        label="Not covered yet"
        title="Problems EarthOS does not track in depth yet."
        summary={`${areas.length} areas that matter but have no dashboard score, policy topic or funding card yet. Each shows one sourced number and where things stand. They are not scored and do not change any other page.`}
      />

      <ul className="grid gap-4 md:grid-cols-2" aria-label="Areas not covered yet">
        {areas.map((a) => (
          <li key={a.id} id={a.id} className="card flex flex-col p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-ink">{a.title}</h2>
              <span className="tag rounded border border-line px-1.5 py-0.5 text-[10px] text-subtle">Not scored · no deep dive yet</span>
            </div>
            <p className="mt-1 text-sm text-muted">{a.why}</p>

            <p className="mt-4 font-mono text-3xl font-bold text-ink-2">{a.figure}</p>
            <p className="mt-1 text-sm text-muted">{a.figureText}.</p>
            <p className="mt-1 text-xs text-subtle">
              <KindBadge kind={a.kind} label={COVER_KIND_LABEL[a.kind]} />{' '}
              <a href={a.source.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                {a.source.name}
              </a>
            </p>

            <div className="mt-4 border-t border-line pt-3">
              <p className="tag text-[10px] text-subtle">Where things stand</p>
              <p className="mt-1 text-sm text-muted">{a.status}</p>
              <a href={a.statusSource.url} target="_blank" rel="noreferrer" className="tag mt-1 inline-block text-[10px] text-accent hover:underline">
                {a.statusSource.name}
              </a>
            </div>
          </li>
        ))}
      </ul>

      <section className="panel p-5" aria-labelledby="nc-how">
        <h2 id="nc-how" className="eyebrow mb-2">How to read this page</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-5 text-xs text-muted">
          <li>Every number is labelled measured, modelled or expert judgement and links to its source, as on the rest of EarthOS.</li>
          <li>Numbers are as published, with their own year. They are checked by hand when the page changes, not refreshed monthly.</li>
          <li>The order is not a ranking. An area leaves this page when it gets a full deep dive.</li>
          <li>
            Areas covered in depth: <Link href="/" className="text-accent hover:underline">Dashboard</Link>,{' '}
            <Link href="/policies" className="text-accent hover:underline">Policies</Link> and{' '}
            <Link href="/funding" className="text-accent hover:underline">Funding</Link>.
          </li>
        </ul>
      </section>
    </>
  );
}
