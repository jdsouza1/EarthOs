import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/site/PageHeader';
import { getPromises, KIND_LABEL, type Pledge, type PromiseGroup, type PromiseResult } from '@/lib/promises';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Promises — EarthOS' };

const SECTION: Record<PromiseGroup, { title: string; intro: string }> = {
  open: {
    title: 'Deadline still ahead',
    intro: 'What was promised, the latest measured figure, and what a named source projects. EarthOS gives no verdict before a deadline.',
  },
  standing: {
    title: 'No end date',
    intro: 'Standing commitments that set no deadline, beside the latest figure.',
  },
  passed: {
    title: 'Deadline passed',
    intro: 'The result is the finding of the source named on each card.',
  },
};

const RESULT: Record<PromiseResult, { label: string; cls: string }> = {
  met: { label: 'Met', cls: 'border-good-line bg-good-bg/40 text-good' },
  met_late: { label: 'Met late', cls: 'border-warning-line bg-warning-bg/40 text-warning-text' },
  missed: { label: 'Not met', cls: 'border-critical-line bg-critical-bg/40 text-critical' },
};

function Src({ name, url }: { name: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
      {name}
    </a>
  );
}

function Progress({ p }: { p: NonNullable<Pledge['progress']> }) {
  const pct = Math.max(0, Math.min(1, p.share));
  const text = p.share < 0 ? `Further from the goal than in ${p.since}` : p.share >= 1 ? 'Goal reached' : `${Math.round(p.share * 100)}% of the way from the ${p.since} level to the goal`;
  return (
    <div className="mt-3">
      <div className="h-1.5 overflow-hidden rounded-full bg-line" role="img" aria-label={text}>
        <div className={`h-full rounded-full ${p.share < 0 ? 'bg-critical' : 'bg-accent'}`} style={{ width: `${Math.max(pct * 100, p.share < 0 ? 100 : 2)}%` }} />
      </div>
      <p className="tag mt-1 text-[10px] text-subtle">{text}</p>
    </div>
  );
}

function Card({ p }: { p: Pledge }) {
  const when = p.deadline ? (p.group === 'passed' ? `Deadline was ${p.deadline}` : `Deadline ${p.deadline}`) : 'No end date';
  return (
    <li id={p.id} className="card flex flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="tag text-[10px] text-subtle">
          {p.area} · {when}
        </span>
        {p.result && <span className={`tag rounded border px-1.5 py-0.5 text-[10px] ${RESULT[p.result].cls}`}>{RESULT[p.result].label}</span>}
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">{p.promise}</h3>
      <p className="mt-1 text-xs text-subtle">
        {p.who}, {p.made} · <Src {...p.source} />
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-3">
        <div>
          <dt className="tag text-[10px] text-subtle">Promised</dt>
          <dd className="mt-1 font-mono text-xl font-bold text-ink-2">{p.promised}</dd>
        </div>
        <div>
          <dt className="tag text-[10px] text-subtle">Now · {p.now.asOf}</dt>
          <dd className="mt-1">
            {p.now.figure && <span className="font-mono text-xl font-bold text-ink-2">{p.now.figure} </span>}
            <span className={p.now.figure ? 'text-xs text-muted' : 'text-sm text-body'}>{p.now.text}</span>
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-subtle">
        {KIND_LABEL[p.now.kind]} · <Src {...p.now.source} />
      </p>

      {p.progress && <Progress p={p.progress} />}

      {p.outlook && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="tag text-[10px] text-subtle">{p.outlook.kind === 'modelled' ? 'Where it is heading' : 'Where it stands'}</p>
          <p className="mt-1 text-sm text-muted">{p.outlook.text}</p>
          <p className="mt-1 text-xs text-subtle">
            {KIND_LABEL[p.outlook.kind]} · <Src {...p.outlook.source} />
          </p>
        </div>
      )}
      {p.note && <p className="mt-3 text-xs text-subtle">{p.note}</p>}
    </li>
  );
}

export default async function PromisesPage() {
  const all = await getPromises();
  const by = (g: PromiseGroup) => all.filter((p) => p.group === g);
  const passed = by('passed');
  const count = (r: PromiseResult) => passed.filter((p) => p.result === r).length;
  const tally = [
    [count('met'), 'met on time'],
    [count('met_late'), 'met late'],
    [count('missed'), 'not met'],
  ]
    .filter(([n]) => n)
    .map(([n, t]) => `${n} ${t}`)
    .join(', ');

  return (
    <>
      <PageHeader
        label="Promises"
        title="What the world promised, and where the numbers stand."
        summary={`${all.length} public commitments beside the measured figure. ${by('open').length} have a deadline still ahead and ${by('standing').length} have none. Of the ${passed.length} whose deadline has passed: ${tally}.`}
      />

      {(['open', 'standing', 'passed'] as PromiseGroup[]).map((g) => (
        <section key={g} aria-labelledby={`pr-${g}`} className="flex flex-col gap-3">
          <div>
            <h2 id={`pr-${g}`} className="text-xl font-semibold text-ink">{SECTION[g].title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">{SECTION[g].intro}</p>
          </div>
          <ul className="grid gap-4 md:grid-cols-2" aria-label={SECTION[g].title}>
            {by(g).map((p) => (
              <Card key={p.id} p={p} />
            ))}
          </ul>
        </section>
      ))}

      <section className="panel p-5" aria-labelledby="pr-how">
        <h2 id="pr-how" className="eyebrow mb-2">How to read this page</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-5 text-xs text-muted">
          <li>A promise is listed only if it was made publicly, has a source anyone can open, and can be set beside a published number.</li>
          <li>Every figure is labelled measured, modelled or expert judgement and links to its source. Projections belong to the source named, not to EarthOS.</li>
          <li>Where a promise matches a live indicator, the figure updates with the monthly refresh; the rest are checked by hand each month. A progress bar appears only where the indicator's official target is the same goal as the promise.</li>
          <li>This is not a complete list, and the order is not a ranking. Many promises are made by countries one at a time; those are on the <Link href="/policies" className="text-accent hover:underline">Policies</Link> pages.</li>
          <li>
            Who can act on each number: <Link href="/levers" className="text-accent hover:underline">Levers</Link>. Promises that were kept, and why:{' '}
            <Link href="/solved" className="text-accent hover:underline">Solved</Link>.
          </li>
        </ul>
      </section>
    </>
  );
}
