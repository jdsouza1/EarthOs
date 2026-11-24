import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/site/PageHeader';
import { AREA_LABEL, getTrackRecord, VERDICT_LABEL, type TrackedForecast, type Verdict } from '@/lib/trackRecord';
import { getComingDue, type ComingDue } from '@/lib/comingDue';
import { getIndicators, type Indicator } from '@/lib/indicators';
import { formatPeriod, formatValue } from '@/lib/format';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Track record — EarthOS' };

const VERDICT_STYLE: Record<Verdict, string> = {
  close: 'border-good-line bg-good-bg text-good',
  too_high: 'border-warning-line bg-warning-bg text-warning-text',
  too_low: 'border-warning-line bg-warning-bg text-warning-text',
  wrong_direction: 'border-critical-line bg-critical-bg text-critical',
};
const IMPACT = {
  better: { text: 'Better news than forecast', cls: 'text-good' },
  worse: { text: 'Worse news than forecast', cls: 'text-critical' },
  mixed: { text: 'Neither simply good nor bad news', cls: 'text-muted' },
} as const;

const fmt = (n: number) => (Math.abs(n) >= 10 ? n.toLocaleString('en-US', { maximumFractionDigits: 0 }) : n.toLocaleString('en-US', { maximumFractionDigits: 2 }));

/** Forecast as a band, outcome as a marker, on one scale. */
function Scale({ f }: { f: TrackedForecast }) {
  if (f.kind === 'direction' || f.low === null || f.high === null || f.outcomeValue === null) return null;
  let min: number, max: number;
  if (f.kind === 'probability') {
    [min, max] = [0, 100];
  } else {
    const lo = Math.min(f.low, f.outcomeValue);
    const hi = Math.max(f.high, f.outcomeValue);
    const pad = (hi - lo) * 0.25 || hi * 0.1;
    [min, max] = [Math.max(0, lo - pad), hi + pad];
  }
  const pos = (v: number) => ((v - min) / (max - min)) * 100;
  const left = pos(f.low);
  const width = Math.max(pos(f.high) - left, 1.5);
  const mark = pos(f.outcomeValue);
  const label = f.kind === 'probability' ? 'Chance given' : 'Forecast';
  return (
    <div className="mt-4" role="img" aria-label={`${label} ${fmt(f.low)} to ${fmt(f.high)} ${f.unit}; outcome ${fmt(f.outcomeValue)} ${f.unit}`}>
      <div className="relative h-2 rounded-full bg-line">
        <div className="absolute h-2 rounded-full bg-subtle" style={{ left: `${left}%`, width: `${width}%` }} />
        <div className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-sm bg-accent" style={{ left: `${mark}%` }} />
      </div>
      <div className="tag mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-subtle">
        <span className="flex items-center gap-1.5"><span className="h-1.5 w-4 rounded bg-subtle" />{label}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-1 rounded-sm bg-accent" />What happened</span>
        <span>Scale {fmt(min)} to {fmt(max)} {f.unit}</span>
      </div>
    </div>
  );
}

function Card({ f }: { f: TrackedForecast }) {
  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tag text-[10px] text-subtle">{AREA_LABEL[f.area]}</p>
          <h2 className="mt-1 text-base font-bold leading-snug text-ink-2">{f.title}</h2>
          <p className="mt-0.5 text-xs text-muted">
            {f.who}, {f.made}
          </p>
        </div>
        <span className={`tag shrink-0 rounded border px-2 py-0.5 text-[11px] ${VERDICT_STYLE[f.verdict]}`}>{VERDICT_LABEL[f.verdict]}</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="tag text-[10px] text-subtle">What they said, for {f.targetYear}</p>
          <p className="mt-1 text-sm text-body">{f.forecast}</p>
        </div>
        <div>
          <p className="tag text-[10px] text-subtle">What happened</p>
          <p className="mt-1 text-sm font-semibold text-ink-2">{f.outcome}</p>
        </div>
      </div>

      <Scale f={f} />

      {f.impact && <p className={`mt-3 text-xs font-semibold ${IMPACT[f.impact].cls}`}>{IMPACT[f.impact].text}</p>}
      {f.note && <p className="mt-2 text-xs text-muted">{f.note}</p>}

      <div className="tag mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-[10px]">
        <a href={f.forecastSource.url} target="_blank" rel="noreferrer" className="text-accent hover:underline" title={f.forecastSource.name}>
          Forecast source
        </a>
        <a href={f.outcomeSource.url} target="_blank" rel="noreferrer" className="text-accent hover:underline" title={f.outcomeSource.name}>
          Outcome source
        </a>
      </div>
    </article>
  );
}

function DueCard({ d, ind, thisYear }: { d: ComingDue; ind: Indicator | undefined; thisYear: number }) {
  const left = d.dueYear - thisYear;
  const when = d.status === 'awaiting_outcome' ? 'Due date passed: awaiting the published outcome' : left <= 0 ? `Due this year` : `Due ${d.dueYear}, in ${left} year${left === 1 ? '' : 's'}`;
  return (
    <article className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tag text-[10px] text-subtle">{AREA_LABEL[d.area]}</p>
          <h3 className="mt-1 text-sm font-bold leading-snug text-ink-2">{d.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {d.who}, {d.published.slice(0, 4)}
          </p>
        </div>
        <span className="tag shrink-0 rounded border border-accent-line bg-accent-bg px-2 py-0.5 text-[11px] text-accent">{d.dueYear}</span>
      </div>
      <p className="tag mt-3 text-[10px] text-subtle">{d.kind === 'probability' ? 'The chance they gave' : 'What they say'}</p>
      <p className="mt-1 text-sm text-body">{d.forecast}</p>
      {ind && (
        <p className="mt-3 text-xs text-muted">
          Live on EarthOS:{' '}
          <a href={`/data?card=${ind.id}#embed`} className="font-semibold text-ink-2 hover:text-accent hover:underline">
            {ind.name} {formatValue(ind.latest.value)} {ind.unit}
          </a>{' '}
          ({formatPeriod(ind.latest.date, ind.annual)})
        </p>
      )}
      {d.note && <p className="mt-2 text-xs text-subtle">{d.note}</p>}
      <div className="tag mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 text-[10px]">
        <span className="text-muted">{when}</span>
        <a href={d.source.url} target="_blank" rel="noreferrer" className="text-accent hover:underline" title={d.source.name}>
          Forecast source
        </a>
      </div>
    </article>
  );
}

export default async function TrackRecordPage() {
  const [list, due, indicators] = await Promise.all([getTrackRecord(), getComingDue(), getIndicators()]);
  const byId = new Map(indicators.map((i) => [i.id, i]));
  const thisYear = new Date().getFullYear();
  const count = (v: Verdict) => list.filter((f) => f.verdict === v).length;
  const parts = (['close', 'too_high', 'too_low', 'wrong_direction'] as Verdict[])
    .filter((v) => count(v) > 0)
    .map((v) => `${count(v)} ${VERDICT_LABEL[v].toLowerCase()}`);

  return (
    <>
      <PageHeader
        label="Forecasts · Track record"
        title="How past forecasts turned out."
        summary="Well-known forecasts whose date has passed, set against what then happened. Some were close, some too gloomy, some too hopeful."
      >
        <p className="text-sm text-ink-2">
          {list.length} forecasts checked: {parts.join(', ')}.{' '}
          {due.length > 0 && (
            <a href="#coming-due" className="text-accent hover:underline">
              {due.length} more coming due
            </a>
          )}
        </p>
        <p className="text-xs text-subtle">
          <Link href="/forecasts" className="text-accent hover:underline">← Today&apos;s forecasts</Link>
        </p>
      </PageHeader>

      <section className="grid gap-4 md:grid-cols-2">
        {list.map((f) => (
          <Card key={f.id} f={f} />
        ))}
      </section>

      {due.length > 0 && (
        <section id="coming-due" className="panel scroll-mt-6 p-5">
          <h2 className="eyebrow mb-1">Coming due</h2>
          <p className="mb-4 max-w-3xl text-xs text-muted">
            Published forecasts whose date has not arrived yet. These are forecasts of where things will land, not goals. When the date passes and the
            result is published, each one moves up to the checked list with its verdict. Where EarthOS tracks the same thing, the live figure is shown.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {due.map((d) => (
              <DueCard key={d.id} d={d} ind={d.indicatorId ? byId.get(d.indicatorId) : undefined} thisYear={thisYear} />
            ))}
          </div>
        </section>
      )}

      <section className="panel p-5">
        <h2 className="eyebrow mb-2">How forecasts get on this page</h2>
        <ol className="max-w-3xl list-decimal space-y-1 pl-5 text-xs text-muted">
          <li>A named body or person published it, with a date.</li>
          <li>It gave a number, a range, a probability or a clear direction.</li>
          <li>Its target date has passed.</li>
          <li>What happened comes from a separate named source.</li>
          <li>Forecasts are chosen by topic, one or more per EarthOS area, not by whether they turned out well or badly.</li>
        </ol>
        <h2 className="eyebrow mb-2 mt-5">How the verdict is set</h2>
        <p className="max-w-3xl text-xs text-muted">
          By a fixed rule, checked every time the site is built. <strong className="text-body">Close</strong>: the outcome fell inside the forecast&apos;s own range,
          or within 10% of a single figure. <strong className="text-body">Too high</strong> or <strong className="text-body">too low</strong>: it fell outside. For a
          chance, less than 50% for something that then happened counts as too low. <strong className="text-body">Wrong direction</strong>: the forecast said
          up and it went down, or the reverse.
        </p>
        <h2 className="eyebrow mb-2 mt-5">What this does and does not tell you</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-5 text-xs text-muted">
          <li>Forecasts miss in both directions. Gloomy ones are not always wrong, and hopeful ones are not always right.</li>
          <li>A warning that led to action can look wrong afterwards, because the action changed the outcome.</li>
          <li>
            {list.length} forecasts are examples, not a statistic. There is no overall accuracy score, because forecasts about different things cannot be
            fairly averaged.
          </li>
        </ul>
      </section>
    </>
  );
}
