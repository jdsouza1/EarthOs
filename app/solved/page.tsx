import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSolved, type Kind, type Status } from '@/lib/solved';
import { PageHeader } from '@/components/site/PageHeader';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Solved — EarthOS' };

const STATUS_STYLE: Record<Status, string> = {
  solved: 'border-good-line bg-good-bg text-good',
  'on track': 'border-accent-line bg-accent-bg text-accent',
  'nearly there': 'border-warning-line bg-warning-bg text-warning-text',
  unfinished: 'border-critical-line bg-critical-bg text-critical',
};
const STATUS_LABEL: Record<Status, string> = { solved: 'Solved', 'on track': 'On track', 'nearly there': 'Nearly there', unfinished: 'Unfinished' };
const CONF: Record<string, string> = { measured: 'Measured', modelled: 'Modelled', expert: 'Expert' };

const BARRETT_BOOK = 'https://econpapers.repec.org/RePEc:oxp:obooks:9780199585212';
const BARRETT_PNAS = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5187718';

const KIND_INFO: { kind: Exclude<Kind, ''>; title: string; what: string; today: ReactNode }[] = [
  {
    kind: 'one',
    title: 'One country can do it',
    what: 'One country, or a few, has both the means and a reason to act alone. Barrett’s examples: finding and deflecting a dangerous asteroid, and GPS.',
    today: (
      <>
        Today: finding large near-Earth asteroids, tracked on the{' '}
        <Link href="/#tier-existential" className="text-accent hover:underline">
          dashboard
        </Link>
        .
      </>
    ),
  },
  {
    kind: 'everyone',
    title: 'Everyone has to finish',
    what: 'It only works when the last country finishes, because one failure leaves everyone at risk. Barrett’s examples: eradicating smallpox and polio.',
    today: <>Today: polio, now down to two countries.</>,
  },
  {
    kind: 'total',
    title: 'The total is what counts',
    what: 'What matters is the combined effort of most countries, so each is tempted to let the others do the work. Barrett’s examples: the ozone layer and climate change.',
    today: (
      <>
        Today: climate, the hardest of the three. See{' '}
        <Link href="/what-if" className="text-accent hover:underline">
          What if
        </Link>{' '}
        for what different choices would mean.
      </>
    ),
  },
];

export default async function SolvedPage() {
  const items = await getSolved();
  const byKind = (k: Kind) => items.filter((i) => i.kind === k).map((i) => i.problem);

  return (
    <>
      <PageHeader
        label="Solved"
        title="It has been done before."
        summary="Humanity has solved global problems. Here is what was fixed, how it was done, and what that says about the problems still open."
      />

      <section aria-labelledby="proof-title" className="flex flex-col gap-4">
        <h2 id="proof-title" className="text-xl">Proof it can be done</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((i) => (
            <article key={i.id} className="panel flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg leading-tight">{i.problem}</h3>
                <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[i.status]}`}>{STATUS_LABEL[i.status]}</span>
              </div>
              <p className="text-2xl font-bold leading-tight text-ink">{i.headline}</p>
              <p className="text-sm text-body">{i.detail}</p>
              <p className="text-sm text-body">
                <span className="font-semibold text-ink">How: </span>
                {i.how}
              </p>
              <p className="mt-auto border-t border-line pt-3 text-xs text-subtle">
                {i.years && <>{i.years} · </>}
                {CONF[i.confidence] ?? i.confidence} ·{' '}
                <a href={i.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-accent">
                  {i.sourceName}
                </a>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="why-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 id="why-title" className="text-xl">Why some problems get solved</h2>
          <p className="max-w-2xl text-sm text-body">
            Economist Scott Barrett sorts global problems by the kind of cooperation they need (
            <a href={BARRETT_BOOK} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Why Cooperate?, Oxford University Press, 2007
            </a>
            ). This is expert judgement, not measurement. EarthOS only shows problems where Barrett’s own examples could be checked; the rest are not classified.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {KIND_INFO.map((k) => {
            const done = byKind(k.kind);
            return (
              <article key={k.kind} className="panel flex flex-col gap-2 p-5">
                <h3 className="text-lg leading-tight">{k.title}</h3>
                <p className="text-sm text-body">{k.what}</p>
                {done.length > 0 && (
                  <p className="text-sm text-body">
                    <span className="font-semibold text-ink">On this page: </span>
                    {done.join(', ')}
                  </p>
                )}
                <p className="text-sm text-body">{k.today}</p>
                <p className="mt-auto pt-2 text-xs text-subtle">Expert</p>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="lesson-title" className="panel flex max-w-3xl flex-col gap-3 p-5">
        <h2 id="lesson-title" className="text-xl">The lesson</h2>
        <p className="text-body">
          Barrett’s finding is that countries struggle to keep voluntary promises, but find it much easier to act together once doing so is in each country’s own interest.
          Smallpox worked because every country stayed at risk until the last case was gone. The ozone treaty worked because it banned trade in the chemicals with countries
          outside it, which made joining the better choice. Climate is harder because each country is tempted to let others carry the cost.
        </p>
        <p className="text-sm text-subtle">
          Expert ·{' '}
          <a href={BARRETT_PNAS} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-accent">
            Barrett, Coordination vs. voluntarism and enforcement in sustaining international environmental cooperation, PNAS (2016)
          </a>
        </p>
        <p className="text-body">
          Who could make the next win happen:{' '}
          <Link href="/levers" className="text-accent hover:underline">
            Levers
          </Link>{' '}
          and{' '}
          <Link href="/what-if" className="text-accent hover:underline">
            What if
          </Link>
          .
        </p>
      </section>
    </>
  );
}
