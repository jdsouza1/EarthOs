import type { Metadata } from 'next';
import { NextStep } from '@/components/site/NextStep';
import Link from 'next/link';
import { getExpertForecasts, getScenarios, OUTCOMES, OUTCOME_LABEL, type ExpertForecast, type Outcome, type Scenario } from '@/lib/forecasts';
import { getIndicators } from '@/lib/indicators';
import { ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/site/PageHeader';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Forecasts — EarthOS' };

/** Log scale from 0.0001% to 100%: six decades, so 1 in a million and 1 in 6 both fit. */
const MIN_EXP = -4;
const MAX_EXP = 2;
const TICKS = [0.0001, 0.001, 0.01, 0.1, 1, 10, 100];
const pos = (v: number) => ((Math.log10(v) - MIN_EXP) / (MAX_EXP - MIN_EXP)) * 100;

/** Results of the tests on past data (data/backtest_p1.csv, backtest.csv, backtest_p3.csv). Method and pass marks: B5 design. */
const BACKTESTS = [
  { name: 'Method 1', what: 'Replays past years in runs of 3 to simulate 10,000 futures.', result: '10 years ahead: 54% inside the 90% band, 29% inside the 50% band (193 tests).' },
  { name: 'Method 2', what: 'The same, replaying whole past decades.', result: '10 years ahead: 51% and 29% (193 tests).' },
  { name: 'Method 3', what: 'Sizes the band from how wrong simple projections were in the past.', result: '10 years ahead: 85% and 32% (200 tests). 5 years ahead: 80% and 33% (292 tests).' },
];

const RISK_ORDER = ['All causes', 'Artificial intelligence', 'Engineered pandemics', 'Nuclear weapons', 'Climate change', 'All natural causes', 'Asteroid or comet impact'];

const OUTCOME_INTRO: Record<Outcome, string> = {
  extinction: 'Fewer than 5,000 people left alive (Metaculus asks simply whether humans go extinct). By 2100.',
  catastrophe: 'More than 10% of the world’s people die within a 5-year period. By 2100.',
  existential:
    'Wider than extinction: the permanent loss of humanity’s long-term potential, including an unrecoverable collapse of civilisation. Over the 100 years from 2020.',
};

function fmtPct(v: number) {
  if (v >= 10) return `${Math.round(v)}%`;
  if (v >= 1) return `${Number(v.toFixed(2))}%`;
  return `${Number(v.toPrecision(2))}%`;
}

/** Ord states his figures as "1 in N"; show them the way he wrote them. */
function fmt(f: ExpertForecast) {
  if (f.outcome === 'existential') {
    const n = Math.round(100 / f.value);
    return `1 in ${n.toLocaleString('en-US')}`;
  }
  return fmtPct(f.value);
}

function dotClass(group: string) {
  if (group.startsWith('Superforecasters')) return 'bg-accent border-accent';
  if (group.startsWith('Domain experts')) return 'bg-ink border-ink';
  return 'bg-canvas border-muted';
}

function Scale() {
  return (
    <div className="relative mb-1 h-4 text-[9px] text-subtle">
      {TICKS.map((t) => (
        <span key={t} className="absolute -translate-x-1/2 font-mono" style={{ left: `${pos(t)}%` }}>
          {t >= 1 ? `${t}%` : `${t}%`}
        </span>
      ))}
    </div>
  );
}

function Row({ f }: { f: ExpertForecast }) {
  return (
    <li className="grid gap-1 border-t border-line py-2 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_4.5rem] md:items-center md:gap-3">
      <div className="text-xs">
        <div className="font-bold text-ink-2">{f.risk}</div>
        <div className="text-muted">{f.group}</div>
      </div>
      <div className="relative h-5">
        {TICKS.map((t) => (
          <span key={t} className="absolute top-0 h-full w-px bg-line" style={{ left: `${pos(t)}%` }} />
        ))}
        {f.low !== null && f.high !== null && (
          <span
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-line-strong"
            style={{ left: `${pos(f.low)}%`, width: `${pos(f.high) - pos(f.low)}%` }}
          />
        )}
        <span
          className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${dotClass(f.group)}`}
          style={{ left: `${pos(f.value)}%` }}
          title={`${f.group}: ${fmt(f)}`}
        />
      </div>
      <div className="flex items-baseline justify-between gap-2 md:block md:text-right">
        <span className="font-mono text-sm font-bold text-ink">{fmt(f)}</span>
        <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="tag text-[9px] text-accent hover:underline md:block">
          Source
        </a>
      </div>
    </li>
  );
}


/** One indicator's published long-range scenarios on a linear scale, with today's measured value marked. */
function ScenarioChart({ name, today, todayLabel, rows }: { name: string; today: number | null; todayLabel: string; rows: Scenario[] }) {
  const unit = rows[0]?.unit ?? '';
  const values = rows.flatMap((r) => [r.value, r.low ?? r.value, r.high ?? r.value]).concat(today !== null ? [today] : []);
  // Temperature starts at 0 °C (pre-industrial) so warming reads as distance from it; other units start near their data.
  const lo = unit === '°C' ? 0 : Math.floor(Math.min(...values));
  const hi = Math.ceil(Math.max(...values));
  const x = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((t, _, a) => a.length <= 8 || t % 2 === 0);
  const groups = [...new Set(rows.map((r) => r.sourceName))];
  return (
    <div className="card p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold text-ink-2">{name}</h3>
        {today !== null && (
          <span className="text-[10px] text-muted">
            <span className="mr-1 inline-block h-2.5 w-0.5 translate-y-0.5 bg-accent" /> {todayLabel}
          </span>
        )}
      </div>
      <div className="md:grid md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_4.5rem] md:gap-3">
        <div className="hidden md:block" />
        <div className="relative mb-1 h-4 text-[9px] text-subtle">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2 font-mono" style={{ left: `${x(t)}%` }}>
              {t}
              {unit === '°C' ? '°' : ''}
            </span>
          ))}
        </div>
        <div className="hidden md:block" />
      </div>
      {groups.map((g) => (
        <div key={g} className="mb-2">
          <a href={rows.find((r) => r.sourceName === g)!.sourceUrl} target="_blank" rel="noreferrer" className="tag text-[9px] text-accent hover:underline">
            {g}
          </a>
          <ul>
            {rows
              .filter((r) => r.sourceName === g)
              .map((r) => (
                <li key={r.scenario} className="grid gap-1 border-t border-line py-1.5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_4.5rem] md:items-center md:gap-3">
                  <div className="text-xs">
                    <div className="font-bold text-ink-2">{r.scenario}</div>
                    <div className="text-[10px] text-muted">{r.description} · {r.period}</div>
                  </div>
                  <div className="relative h-5">
                    {ticks.map((t) => (
                      <span key={t} className="absolute top-0 h-full w-px bg-line" style={{ left: `${x(t)}%` }} />
                    ))}
                    {today !== null && <span className="absolute top-0 h-full w-0.5 bg-accent" style={{ left: `${x(today)}%` }} />}
                    {r.low !== null && r.high !== null && (
                      <span className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-line-strong" style={{ left: `${x(r.low)}%`, width: `${x(r.high) - x(r.low)}%` }} />
                    )}
                    <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-canvas" style={{ left: `${x(r.value)}%` }} />
                  </div>
                  <div className="font-mono text-sm font-bold text-ink md:text-right">
                    {r.value}
                    {r.unit === '°C' ? ' °C' : ` ${r.unit}`}
                    {r.low !== null && <div className="text-[9px] font-normal text-subtle">{r.low}–{r.high}</div>}
                  </div>
                </li>
              ))}
          </ul>
          <p className="mt-1 text-[10px] text-subtle">{rows.find((r) => r.sourceName === g)!.note}</p>
        </div>
      ))}
    </div>
  );
}

export default async function ForecastsPage() {
  const [all, scenarios, indicators] = await Promise.all([getExpertForecasts(), getScenarios(), getIndicators()]);
  const byOutcome = (o: Outcome) =>
    all
      .filter((f) => f.outcome === o)
      .sort((a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk) || a.group.localeCompare(b.group));

  // Headline, worked out from the data rather than typed: the spread of published all-cause extinction estimates for 2100.
  const ext = all.filter((f) => f.outcome === 'extinction' && f.risk === 'All causes' && f.horizon === '2100');
  const lo = ext.length ? Math.min(...ext.map((f) => f.value)) : null;
  const hi = ext.length ? Math.max(...ext.map((f) => f.value)) : null;
  const ordTotal = all.find((f) => f.outcome === 'existential' && f.risk === 'All causes');
  const sources = new Map<string, { sourceName: string; sourceUrl: string; published: string; retrieved: string }>([...all, ...scenarios].map((f) => [f.sourceName, f] as const));

  const outcomeSection = (o: Outcome) => {
    const rows = byOutcome(o);
    if (rows.length === 0) return null;
    return (
      <section key={o} className="panel p-5" aria-labelledby={`outcome-${o}`}>
        <h2 id={`outcome-${o}`} className="eyebrow">{OUTCOME_LABEL[o]}</h2>
        <p className="mb-3 mt-1 max-w-3xl text-sm text-muted">{OUTCOME_INTRO[o]} Log scale: each step to the right is 10 times larger.</p>
        <div className="md:grid md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_4.5rem] md:gap-3">
          <div className="hidden md:block" />
          <Scale />
          <div className="hidden md:block" />
        </div>
        <ul>{rows.map((f) => <Row key={f.id} f={f} />)}</ul>
      </section>
    );
  };
  const [firstOutcome, ...otherOutcomes] = OUTCOMES;
  const fold = 'cursor-pointer list-none [&::-webkit-details-marker]:hidden';

  return (
    <>
      <PageHeader
        label="Forecasts"
        title={lo !== null && hi !== null ? <>Human extinction by 2100: {fmtPct(lo)} to {fmtPct(hi)}.</> : 'Published forecasts'}
        summary={
          <>
            The range of {ext.length} published estimates. EarthOS calculates no survival figure of its own and never averages these: they
            measure different things, and a blend would be a new estimate nobody published.
          </>
        }
      >
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-accent bg-accent" /> Superforecasters</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-ink bg-ink" /> Domain experts</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border-2 border-muted bg-canvas" /> Other forecasters and researchers</span>
          <span className="flex items-center gap-1.5"><span className="h-1 w-5 rounded bg-line-strong" /> Range the source gives</span>
        </div>
        <p className="text-sm">
          <Link href="/forecasts/track-record" className="font-semibold text-accent hover:underline">
            How have past forecasts turned out? See the track record →
          </Link>{' '}
          <Link href="/forecasts/deep-time" className="font-semibold text-accent hover:underline">
            Can history warn us in time? →
          </Link>
        </p>
      </PageHeader>

      {outcomeSection(firstOutcome)}

      {otherOutcomes.some((o) => byOutcome(o).length > 0) && (
        <details className="group">
          <summary className={`${fold} panel p-5 text-[15px] font-semibold text-accent hover:underline`}>
            <span className="group-open:hidden">Show estimates for a global catastrophe and an existential catastrophe, by cause</span>
            <span className="hidden group-open:inline">Hide other definitions</span>
            {ordTotal && (
              <span className="mt-1 block text-sm font-normal text-muted no-underline">
                Toby Ord puts the wider risk of an existential catastrophe over 100 years at about {fmt(ordTotal)}.
              </span>
            )}
          </summary>
          <div className="mt-6 flex flex-col gap-6">{otherOutcomes.map(outcomeSection)}</div>
        </details>
      )}

      {scenarios.length > 0 && (
        <section className="panel p-5" aria-labelledby="scenarios-title">
          <h2 id="scenarios-title" className="eyebrow">Published long-range scenarios</h2>
          <p className="mb-3 mt-1 max-w-3xl text-sm text-muted">
            Modelled, as published. Each assumes different choices by the world, so none is a prediction. The blue line is today&apos;s measured value.
          </p>
          <div className="grid gap-3">
            {[...new Set(scenarios.map((sc) => sc.indicatorId))].map((id) => {
              const ind = indicators.find((i) => i.id === id);
              const level = ind?.target?.level ?? null;
              const today = id === 'temp_anomaly_c_global' ? level : ind?.latest.value ?? null;
              const label =
                id === 'temp_anomaly_c_global'
                  ? `Today: about ${today?.toFixed(2)} °C (latest 12-month mean)`
                  : `Today: ${ind?.latest.value} ${ind?.unit} (${ind?.latest.date.slice(0, 4)})`;
              return <ScenarioChart key={id} name={ind?.name ?? id} today={today} todayLabel={label} rows={scenarios.filter((sc) => sc.indicatorId === id)} />;
            })}
          </div>
        </section>
      )}

      <section className="panel px-5 py-1" aria-label="More detail">
        <details className="group border-b border-line">
          <summary className={`${fold} flex items-center justify-between gap-3 py-3.5`}>
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold text-ink">How to read these numbers</span>
              <span className="text-sm text-muted">Judgements, not measurements. Four things to keep in mind.</span>
            </span>
            <ChevronDown size={16} className="shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul className="mb-4 grid gap-2 text-sm text-muted md:grid-cols-2">
            <li className="card p-3">
              <span className="font-semibold text-ink-2">They are judgements, not measurements.</span> The risk estimates are labelled
              &quot;expert&quot; and the scenarios &quot;modelled&quot;. None of them can be checked until the date it is about.
            </li>
            <li className="card p-3">
              <span className="font-semibold text-ink-2">Definitions differ.</span> Extinction, a global catastrophe and an existential
              catastrophe are different outcomes, so they are shown in separate charts.
            </li>
            <li className="card p-3">
              <span className="font-semibold text-ink-2">The 2022 tournament came before ChatGPT.</span> Forecasts were made from June
              to October 2022. A later study by the same institute found that participants underestimated how fast AI improved (<a href="https://forecastingresearch.org/research/near-term-xpt-accuracy" target="_blank" rel="noreferrer" className="text-accent hover:underline">FRI near-term accuracy report</a>).
            </li>
            <li className="card p-3">
              <span className="font-semibold text-ink-2">Metaculus moves daily.</span> The figure is a dated snapshot, refreshed
              monthly. Nobody can collect on a correct &quot;yes&quot; to an extinction question, which weakens the incentive to
              forecast it carefully.
            </li>
          </ul>
        </details>
        <details className="group border-b border-line">
          <summary className={`${fold} flex items-center justify-between gap-3 py-3.5`}>
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold text-ink">Projections: tested, not published</span>
              <span className="text-sm text-muted">{BACKTESTS.length} methods were tested on past data against pass marks set in advance. None passed.</span>
            </span>
            <ChevronDown size={16} className="shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="mb-4 text-sm text-muted">
            <p className="mb-3 max-w-3xl">
              EarthOS tried to project each measured indicator 10 years ahead, with a band meant to hold the real outcome 9 times
              in 10. Before publishing, each method was run on past years and compared with what happened.
            </p>
            <ul className="grid gap-2 md:grid-cols-3">
              {BACKTESTS.map((t) => (
                <li key={t.name} className="card p-3">
                  <div className="font-semibold text-ink-2">{t.name}</div>
                  <p className="mt-1">{t.what}</p>
                  <p className="mt-2 font-mono text-xs text-ink-2">{t.result}</p>
                  <span className="mt-2 inline-block rounded border border-critical-line bg-critical-bg/40 px-1.5 py-0.5 text-xs text-critical">Did not pass</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 max-w-3xl">
              Pass marks, set before each test: 85–95% of real outcomes inside the 90% band, and 40–60% inside the 50% band. The
              third method&apos;s wide band was about right, but its middle range was too narrow, so it also failed. Until a method
              passes, this page shows other people&apos;s published estimates only.
            </p>
          </div>
        </details>
        <details className="group">
          <summary className={`${fold} flex items-center justify-between gap-3 py-3.5`}>
            <span className="flex flex-col">
              <span className="text-[15px] font-semibold text-ink">Sources</span>
              <span className="text-sm text-muted">{sources.size} sources, with publication and check dates.</span>
            </span>
            <ChevronDown size={16} className="shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul className="mb-3 space-y-1 text-sm">
            {[...sources.values()].map((f) => (
              <li key={f.sourceName}>
                <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  {f.sourceName}
                </a>
                <span className="text-subtle"> · published {f.published} · checked {f.retrieved}</span>
              </li>
            ))}
          </ul>
          <p className="mb-4 text-sm text-muted">
            How this fits the rest of the site: <Link href="/methodology" className="text-accent hover:underline">Methodology</Link>.
          </p>
        </details>
      </section>

      <NextStep from="/forecasts" />
    </>
  );
}
