import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/site/PageHeader';
import {
  getHistoryTests,
  RESULT_LABEL,
  TEST_LABEL,
  TEST_MEANING,
  TEST_ORDER,
  TESTED_BY_LABEL,
  type HistoryTest,
  type TestKind,
  type TestResult,
} from '@/lib/historyTests';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Deep time — EarthOS' };

const TEST_STYLE: Record<TestKind, string> = {
  real_future: 'border-good-line bg-good-bg text-good',
  held_back: 'border-accent-line bg-accent-bg text-accent',
  past_only: 'border-warning-line bg-warning-bg text-warning-text',
};
const RESULT_STYLE: Record<TestResult, string> = {
  supported: 'text-ink-2',
  mixed: 'text-warning-text',
  too_early: 'text-muted',
};

/** Three steps, filled up to this test's strength. */
function Strength({ t }: { t: TestKind }) {
  const n = 3 - TEST_ORDER.indexOf(t);
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span key={i} className={`h-2.5 w-1.5 rounded-sm ${i < n ? 'bg-current' : 'bg-line'}`} />
      ))}
    </span>
  );
}

function Source({ s, label }: { s: { name: string; url: string }; label: string }) {
  return (
    <a href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline" title={s.name}>
      {label}
    </a>
  );
}

function TestCard({ t }: { t: HistoryTest }) {
  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tag text-[10px] text-subtle">{t.topic}</p>
          <h3 className="mt-1 text-base font-bold leading-snug text-ink-2">{t.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {t.who}, {t.published}
          </p>
        </div>
        <span className={`tag flex shrink-0 items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] ${TEST_STYLE[t.test]}`}>
          <Strength t={t.test} />
          {TEST_LABEL[t.test].replace('Tested ', '')}
        </span>
      </div>

      <p className="tag mt-4 text-[10px] text-subtle">The claim</p>
      <p className="mt-1 text-sm text-body">{t.claim}</p>

      <p className="tag mt-3 text-[10px] text-subtle">
        What the test found · {TESTED_BY_LABEL[t.testedBy].toLowerCase()}, {t.testYear}
      </p>
      <p className="mt-1 text-sm text-body">{t.finding}</p>
      <p className={`mt-2 text-xs font-semibold ${RESULT_STYLE[t.result]}`}>{RESULT_LABEL[t.result]}</p>

      {t.laterCheck && (
        <>
          <p className="tag mt-3 text-[10px] text-subtle">A later check</p>
          <p className="mt-1 text-sm text-body">{t.laterCheck}</p>
        </>
      )}
      {t.note && <p className="mt-2 text-xs text-muted">{t.note}</p>}

      <div className="tag mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-[10px]">
        {t.claimSource.url === t.testSource.url ? (
          <Source s={t.claimSource} label="Source" />
        ) : (
          <>
            <Source s={t.claimSource} label="Claim source" />
            <Source s={t.testSource} label="Test source" />
          </>
        )}
        {t.laterSource && <Source s={t.laterSource} label={t.laterCheck ? 'Later check' : 'Summary'} />}
      </div>
    </article>
  );
}

export default async function DeepTimePage() {
  const tests = await getHistoryTests();
  const n = (k: TestKind) => tests.filter((t) => t.test === k).length;
  const counts = TEST_ORDER.filter((k) => n(k) > 0).map((k) => `${n(k)} ${TEST_LABEL[k].replace('Tested ', '').toLowerCase()}`);

  return (
    <>
      <PageHeader
        label="Forecasts · Deep time"
        title="Can history warn us in time?"
        summary="Researchers have built methods that claim to spot crises before they happen. Here is how each was tested, and what the tests found, including where they fell short. EarthOS runs no test of its own here."
      >
        <p className="text-sm text-ink-2">
          {tests.length} methods: tested {counts.join(', ')}.
        </p>
        <p className="text-xs text-subtle">
          <Link href="/forecasts" className="text-accent hover:underline">← Today&apos;s forecasts</Link>
          {' · '}
          <Link href="/forecasts/track-record" className="text-accent hover:underline">Track record</Link>
        </p>
      </PageHeader>

      {TEST_ORDER.filter((k) => n(k) > 0).map((k) => (
        <section key={k} aria-labelledby={`h-${k}`}>
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id={`h-${k}`} className="eyebrow">
              {TEST_LABEL[k]}
            </h2>
            <p className="text-xs text-muted">{TEST_MEANING[k]}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {tests
              .filter((t) => t.test === k)
              .map((t) => (
                <TestCard key={t.id} t={t} />
              ))}
          </div>
        </section>
      ))}

      <section className="panel p-5">
        <h2 className="eyebrow mb-2">How methods get on this page</h2>
        <ol className="max-w-3xl list-decimal space-y-1 pl-5 text-xs text-muted">
          <li>A named person or body published it, with a date.</li>
          <li>It claims to anticipate something: a crisis, a collapse, a rise or fall in violence.</li>
          <li>Someone published a test of it against history or against what happened next.</li>
          <li>Methods are chosen by topic, not by whether they passed. Ones that weakened stay on the page.</li>
        </ol>

        <h2 className="eyebrow mb-2 mt-5">How the test label is set</h2>
        <p className="max-w-3xl text-xs text-muted">
          One of three fixed labels, checked every time the site is built. A claim can only be marked{' '}
          <strong className="text-body">tested on the real future</strong> if it was published before the test.{' '}
          <strong className="text-body">Held-back data</strong> means the method was built on some years and checked on others.{' '}
          <strong className="text-body">Only on the past</strong> means the method was checked against the same history it was built from. Each card also
          says whether the authors or someone independent ran the test. The line under each finding gives the testers&apos; own verdict, not EarthOS&apos;s.
        </p>

        <h2 className="eyebrow mb-2 mt-5">What this does and does not tell you</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-5 text-xs text-muted">
          <li>
            Warning signs found looking back are easier to find than warning signs that work in real time. Only the real-future tests show the second.
          </li>
          <li>{tests.length} methods are examples, not a statistic. There is no overall score for whether warning signs work.</li>
          <li>
            EarthOS does not match today against past collapses. With only a few dozen well-recorded cases, a match can almost always be found.
          </li>
          <li>
            Past crises did not all end the same way. The Seshat team&apos;s{' '}
            <a href="https://www.cambridge.org/core/product/E1D2B51191D90217272192C2F7A173B4/core-reader" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Crisis Database
            </a>{' '}
            describes 168 of them, with outcomes from collapse to reform.
          </li>
          <li>
            EarthOS uses no AI model to read history. On a{' '}
            <a href="https://zenodo.org/records/14671248" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              test built from the Seshat history databank
            </a>
            , the best model scored 46% on four-choice questions, where guessing scores 25%.
          </li>
        </ul>
      </section>
    </>
  );
}
