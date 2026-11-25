import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { NextStep } from '@/components/site/NextStep';
import Link from 'next/link';
import { getExpertForecasts, getScenarios, OUTCOMES, OUTCOME_LABEL, type ExpertForecast, type Outcome, type Scenario } from '@/lib/forecasts';
import { getIndicators, loadIndicatorSeries } from '@/lib/indicators';
import { ChevronDown } from 'lucide-react';
import { PageHeader } from '@/components/site/PageHeader';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Forecasts — EarthOS' };

/**
 * Log scale fitted to each chart: from the decade below its smallest figure to the decade above its largest,
 * so no chart carries empty decades and no range bar runs off the edge.
 */
interface Axis {
  ticks: number[];
  pos: (v: number) => number;
}
function axisFor(rows: ExpertForecast[]): Axis {
  const vals = rows.flatMap((f) => [f.value, f.low ?? f.value, f.high ?? f.value]);
  const minExp = Math.floor(Math.log10(Math.min(...vals)) + 1e-9);
  const maxExp = Math.min(2, Math.ceil(Math.log10(Math.max(...vals)) - 1e-9));
  const ticks = Array.from({ length: maxExp - minExp + 1 }, (_, i) => Number((10 ** (minExp + i)).toPrecision(1)));
  return { ticks, pos: (v) => ((Math.log10(v) - minExp) / (maxExp - minExp || 1)) * 100 };
}
const tickPct = (t: number) => `${t >= 1 ? t : t.toFixed(Math.max(0, -Math.floor(Math.log10(t))))}%`;
const oneIn = (t: number) => (t >= 100 ? '' : `1 in ${Math.round(100 / t).toLocaleString('en-US')}`);

/** Results of the tests on past data (data/backtest_p1.csv, backtest.csv, backtest_p3.csv). Method and pass marks: B5 design. */
const BACKTESTS = [
  { name: 'Method 1', what: 'Replays past years in runs of 3 to simulate 10,000 futures.', result: '10 years ahead: 54% inside the 90% band, 29% inside the 50% band (193 tests).' },
  { name: 'Method 2', what: 'The same, replaying whole past decades.', result: '10 years ahead: 51% and 29% (193 tests).' },
  { name: 'Method 3', what: 'Sizes the band from how wrong simple projections were in the past.', result: '10 years ahead: 85% and 32% (200 tests). 5 years ahead: 80% and 33% (292 tests).' },
];

const RISK_ORDER = ['All causes', 'Artificial intelligence', 'Engineered pandemics', 'Nuclear weapons', 'Climate change', 'All natural causes', 'Asteroid or comet impact'];

const OUTCOME_INTRO: Record<Outcome, string> = {
  extinction: 'Fewer than 5,000 people left alive (Metaculus asks simply whether humans go extinct). By 2100.',
  catastrophe:
    'More than 10% of the world’s people die within a 5-year period. By 2100. The 2022 tournament and the 2026 panel come from the same institute but asked different people, so the two are not a trend.',
  existential:
    'Wider than extinction: the permanent loss of humanity’s long-term potential, including an unrecoverable collapse of civilisation or a permanent loss of human control. Toby Ord’s figures cover the 100 years from 2020; the survey of AI researchers sets no deadline.',
};

function fmtPct(v: number) {
  if (v >= 10) return `${Math.round(v)}%`;
  if (v >= 1) return `${Number(v.toFixed(2))}%`;
  return `${Number(v.toPrecision(2))}%`;
}

/** Ord states his figures as "1 in N"; show them the way he wrote them. */
function fmt(f: ExpertForecast) {
  if (f.group.startsWith('Toby Ord')) {
    const n = Math.round(100 / f.value);
    return `1 in ${n.toLocaleString('en-US')}`;
  }
  return fmtPct(f.value);
}

/** The tournament's two groups first, so the paired row leads each cause. */
const groupRank = (g: string) => (g.startsWith('Superforecasters') ? 0 : g.startsWith('Domain experts') ? 1 : 2);

function dotClass(group: string) {
  if (group.startsWith('Superforecasters')) return 'bg-accent border-accent';
  if (group.startsWith('Domain experts')) return 'bg-ink border-ink';
  return 'bg-canvas border-muted';
}

function Scale({ axis }: { axis: Axis }) {
  // On charts with many decades the "1 in N" line is dropped and every other tick is labelled, so labels never collide.
  const plain = axis.ticks.length <= 5;
  return (
    <div className={`relative mb-1 text-[9px] text-subtle ${plain ? 'h-7' : 'h-4'}`}>
      {axis.ticks.map((t, i) => (plain || (axis.ticks.length - 1 - i) % 2 === 0) && (
        <span
          key={t}
          className={`absolute whitespace-nowrap text-center font-mono leading-tight ${i === 0 ? '' : i === axis.ticks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`}
          style={{ left: `${axis.pos(t)}%` }}
        >
          {tickPct(t)}
          {plain && <span className="block font-sans text-[9px] text-subtle">{oneIn(t)}</span>}
        </span>
      ))}
    </div>
  );
}

const GRID = 'md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_7.5rem]';

function Track({ axis, children, tall }: { axis: Axis; children: ReactNode; tall?: boolean }) {
  return (
    <div className={`relative ${tall ? 'h-7' : 'h-5'}`}>
      {axis.ticks.map((t) => (
        <span key={t} className="absolute top-0 h-full w-px bg-line" style={{ left: `${axis.pos(t)}%` }} />
      ))}
      {children}
    </div>
  );
}

function Row({ f, axis }: { f: ExpertForecast; axis: Axis }) {
  return (
    <li className={`grid gap-1 border-t border-line py-2 ${GRID} md:items-center md:gap-3`}>
      <div className="text-xs">
        <div className="font-bold text-ink-2">{f.risk}</div>
        <div className="text-muted">
          {f.group}
          {f.asked && <span className="text-subtle"> · asked {f.asked}</span>}
        </div>
      </div>
      <Track axis={axis}>
        {f.low !== null && f.high !== null && (
          <span
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-line-strong"
            style={{ left: `${axis.pos(f.low)}%`, width: `${axis.pos(f.high) - axis.pos(f.low)}%` }}
          />
        )}
        <span
          className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${dotClass(f.group)}`}
          style={{ left: `${axis.pos(f.value)}%` }}
          title={`${f.group}: ${fmt(f)}`}
        />
      </Track>
      <div className="flex items-baseline justify-between gap-2 md:block md:text-right">
        <span className="font-mono text-sm font-bold text-ink">{fmt(f)}</span>
        <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="tag text-[9px] text-accent hover:underline md:block">
          Source
        </a>
      </div>
    </li>
  );
}

/**
 * Two groups from the same tournament answering the same question, drawn on one line so the gap between them shows.
 * The "times" figure is only the ratio of the two published numbers; nothing is averaged.
 */
function PairRow({ sf, ex, axis }: { sf: ExpertForecast; ex: ExpertForecast; axis: Axis }) {
  const ratio = ex.value / sf.value;
  const times = ratio >= 3 ? Math.round(ratio) : Number(ratio.toFixed(1));
  const a = axis.pos(Math.min(sf.value, ex.value));
  const b = axis.pos(Math.max(sf.value, ex.value));
  const side = (f: ExpertForecast, cls: string, label: string) => (
    <span className="flex items-baseline gap-1.5 md:justify-end">
      <span className={`h-2 w-2 shrink-0 translate-y-[-1px] rounded-full border-2 ${cls}`} aria-hidden="true" />
      <span className="text-[10px] text-muted">{label}</span>
      <span className="font-mono text-sm font-bold text-ink">{fmt(f)}</span>
    </span>
  );
  return (
    <li className={`grid gap-1 border-t border-line py-2.5 ${GRID} md:items-center md:gap-3`}>
      <div className="text-xs">
        <div className="font-bold text-ink-2">{sf.risk}</div>
        <div className="text-muted">
          {ex.group} put it {times} times as high as superforecasters
          {sf.asked && <span className="text-subtle"> · asked {sf.asked}</span>}
        </div>
      </div>
      <Track axis={axis} tall>
        <span className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-muted" style={{ left: `${a}%`, width: `${b - a}%` }} />
        <span
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${dotClass(sf.group)}`}
          style={{ left: `${axis.pos(sf.value)}%` }}
          title={`${sf.group}: ${fmt(sf)}`}
        />
        <span
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 ${dotClass(ex.group)}`}
          style={{ left: `${axis.pos(ex.value)}%` }}
          title={`${ex.group}: ${fmt(ex)}`}
        />
      </Track>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 md:block md:text-right">
        {side(sf, dotClass(sf.group), 'Super.')}
        {side(ex, dotClass(ex.group), 'Experts')}
        <span className="tag block text-[9px]">
          {[...new Map([sf, ex].map((f) => [f.sourceUrl, f])).values()].map((f) => (
            <a key={f.sourceUrl} href={f.sourceUrl} target="_blank" rel="noreferrer" className="ml-2 text-accent hover:underline">
              Source
            </a>
          ))}
        </span>
      </div>
    </li>
  );
}

/** One indicator's published long-range scenarios on a linear scale, with today's measured value marked. */
function ScenarioChart({
  name,
  today,
  todayLabel,
  rows,
  band,
}: {
  name: string;
  today: number | null;
  todayLabel: string;
  rows: Scenario[];
  /** An agreed limit drawn behind every row, e.g. the Paris Agreement's 1.5 to 2 °C. */
  band?: { from: number; to: number; label: string };
}) {
  const unit = rows[0]?.unit ?? '';
  const values = rows.flatMap((r) => [r.value, r.low ?? r.value, r.high ?? r.value]).concat(today !== null ? [today] : []);
  // Temperature starts at 0 °C (pre-industrial) so warming reads as distance from it; other units start near their data.
  const lo = unit === '°C' ? 0 : Math.floor(Math.min(...values));
  const hi = Math.ceil(Math.max(...values));
  const x = (v: number) => ((v - lo) / (hi - lo || 1)) * 100;
  const ticks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter((t, _, a) => a.length <= 8 || t % 2 === 0);
  const groups = [...new Set(rows.map((r) => r.sourceName))];
  // Counts of the published central estimates against the agreed limit: a tally, not a new estimate.
  const above = band ? { from: rows.filter((r) => r.value > band.from).length, to: rows.filter((r) => r.value > band.to).length } : null;
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
      {band && above && (
        <p className="mb-3 text-sm text-ink-2">
          By central estimate, {above.from} of {rows.length} published scenarios end the century above {band.from} {unit}, and {above.to} above{' '}
          {band.to} {unit}.
          <span className="ml-2 whitespace-nowrap text-[10px] text-muted">
            <span className="mr-1 inline-block h-2.5 w-4 translate-y-0.5 rounded-sm bg-good/25 ring-1 ring-good-line" /> {band.label}
          </span>
        </p>
      )}
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
                    {band && (
                      <span
                        className="absolute -bottom-1.5 -top-1.5 bg-good/15"
                        style={{ left: `${x(band.from)}%`, width: `${x(band.to) - x(band.from)}%` }}
                      />
                    )}
                    {today !== null && <span className="absolute -bottom-1.5 -top-1.5 w-0.5 bg-accent" style={{ left: `${x(today)}%` }} />}
                    {r.low !== null && r.high !== null && (
                      <span className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-line-strong" style={{ left: `${x(r.low)}%`, width: `${x(r.high) - x(r.low)}%` }} />
                    )}
                    <span
                      className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink ${groups.indexOf(g) === 0 ? 'bg-canvas' : 'bg-ink'}`}
                      style={{ left: `${x(r.value)}%` }}
                    />
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

/**
 * A measured history with one published projection for a single future year: the line is the record,
 * the dashed stretch and open dot are the source's projection. Drawn only from the two published series.
 */
function TrendChart({ name, points, sc, from }: { name: string; points: { date: string; value: number }[]; sc: Scenario; from: number }) {
  const pts = points.map((p) => ({ year: Number(p.date.slice(0, 4)), value: p.value })).filter((p) => p.year >= from);
  const target = Number(sc.period);
  const last = pts[pts.length - 1];
  const vals = pts.map((p) => p.value).concat(sc.value);
  const lo = Math.floor(Math.min(...vals) / 10) * 10;
  const hi = Math.ceil(Math.max(...vals) / 10) * 10;
  const x = (y: number) => ((y - from) / (target - from)) * 100;
  const y = (v: number) => 100 - ((v - lo) / (hi - lo)) * 100;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.year).toFixed(2)} ${y(p.value).toFixed(2)}`).join(' ');
  const yTicks = Array.from({ length: (hi - lo) / 10 + 1 }, (_, i) => lo + i * 10);
  const xTicks = [from, ...[1950, 1975, 2000, 2025].filter((t) => t > from + 10 && t < target - 10), target];
  return (
    <div className="card p-3">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-bold text-ink-2">{name}</h3>
        <span className="flex flex-wrap gap-3 text-[10px] text-muted">
          <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-accent" /> Measured</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full border-2 border-ink bg-canvas" /> Projected, {sc.scenario.toLowerCase()}</span>
        </span>
      </div>
      <div className="flex gap-2">
        <div className="relative w-6 shrink-0 text-right font-mono text-[9px] text-subtle">
          {yTicks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${y(t)}%` }}>{t}</span>
          ))}
        </div>
        <div
          className="relative h-44 flex-1"
          role="img"
          aria-label={`${name}: ${pts[0].value} ${sc.unit} in ${pts[0].year}, ${last.value} in ${last.year}, projected ${sc.value} in ${target}.`}
        >
          {yTicks.map((t) => (
            <span key={t} className="absolute left-0 h-px w-full bg-line" style={{ top: `${y(t)}%` }} />
          ))}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
            <path d={d} fill="none" className="stroke-accent" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            <line
              x1={x(last.year)} y1={y(last.value)} x2={100} y2={y(sc.value)}
              className="stroke-muted" strokeWidth={1.5} strokeDasharray="4 4" vectorEffect="non-scaling-stroke"
            />
          </svg>
          <span className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" style={{ left: `${x(last.year)}%`, top: `${y(last.value)}%` }} />
          <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-canvas" style={{ left: '100%', top: `${y(sc.value)}%` }} />
          <span className="absolute -translate-x-full -translate-y-full pr-2 pb-1 text-right font-mono text-xs font-bold text-ink" style={{ left: `${x(last.year)}%`, top: `${y(last.value)}%` }}>
            {last.value}
            <span className="block font-sans text-[9px] font-normal text-muted">{last.year}</span>
          </span>
          <span className="absolute -translate-x-full translate-y-1 pr-2 pt-1 text-right font-mono text-xs font-bold text-ink" style={{ left: '100%', top: `${y(sc.value)}%` }}>
            {sc.value}
            <span className="block font-sans text-[9px] font-normal text-muted">{target}, projected</span>
          </span>
        </div>
      </div>
      <div className="relative ml-8 mt-1 h-4 font-mono text-[9px] text-subtle">
        {xTicks.map((t, i) => (
          <span key={t} className={`absolute ${i === 0 ? '' : i === xTicks.length - 1 ? '-translate-x-full' : '-translate-x-1/2'}`} style={{ left: `${x(t)}%` }}>{t}</span>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-subtle">
        <span className="text-muted">{sc.unit === 'years' ? 'Years, at birth. ' : ''}{sc.description}.</span> Modelled ·{' '}
        <a href={sc.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">{sc.sourceName}</a> · {sc.note}
      </p>
    </div>
  );
}

export default async function ForecastsPage() {
  const [all, scenarios, indicators, series] = await Promise.all([getExpertForecasts(), getScenarios(), getIndicators(), loadIndicatorSeries()]);
  const byOutcome = (o: Outcome) =>
    all
      .filter((f) => f.outcome === o)
      .sort((a, b) => RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk) || groupRank(a.group) - groupRank(b.group) || b.published.localeCompare(a.published) || a.group.localeCompare(b.group));

  // Headline, worked out from the data rather than typed: the spread of published all-cause extinction estimates for 2100.
  const ext = all.filter((f) => f.outcome === 'extinction' && f.risk === 'All causes' && f.horizon === '2100');
  const lo = ext.length ? Math.min(...ext.map((f) => f.value)) : null;
  const hi = ext.length ? Math.max(...ext.map((f) => f.value)) : null;
  const ordTotal = all.find((f) => f.outcome === 'existential' && f.risk === 'All causes');
  const sources = new Map<string, { sourceName: string; sourceUrl: string; published: string; retrieved: string }>([...all, ...scenarios].map((f) => [f.sourceName, f] as const));

  const outcomeSection = (o: Outcome) => {
    const rows = byOutcome(o);
    if (rows.length === 0) return null;
    const axis = axisFor(rows);
    return (
      <section key={o} className="panel p-5" aria-labelledby={`outcome-${o}`}>
        <h2 id={`outcome-${o}`} className="eyebrow">{OUTCOME_LABEL[o]}</h2>
        <p className="mb-3 mt-1 max-w-3xl text-sm text-muted">{OUTCOME_INTRO[o]} Log scale: each step to the right is 10 times larger.</p>
        <div className={`md:grid ${GRID} md:gap-3`}>
          <div className="hidden md:block" />
          <Scale axis={axis} />
          <div className="hidden md:block" />
        </div>
        <ul>
          {rows.map((f) => {
            // Same source, same cause: the superforecaster row carries its expert partner; the partner draws nothing itself.
            const partner = rows.find(
              (g) => g !== f && g.risk === f.risk && g.sourceName === f.sourceName && g.horizon === f.horizon &&
                g.group.startsWith('Domain experts') !== f.group.startsWith('Domain experts') &&
                (g.group.startsWith('Domain experts') || g.group.startsWith('Superforecasters')) &&
                (f.group.startsWith('Domain experts') || f.group.startsWith('Superforecasters')),
            );
            if (!partner) return <Row key={f.id} f={f} axis={axis} />;
            if (f.group.startsWith('Domain experts')) return null;
            return <PairRow key={f.id} sf={f} ex={partner} axis={axis} />;
          })}
        </ul>
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
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-muted" /> Same tournament, two groups</span>
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
            Modelled, as published. Each assumes different choices by the world, so none is a prediction. On the temperature chart the blue line is today&apos;s measured value and the shaded band is the Paris Agreement range.
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
              const rows = scenarios.filter((sc) => sc.indicatorId === id);
              const pts = series.get(id)?.points ?? [];
              // One projection for one named year, and a yearly record to lead up to it: draw the trend, not a single bar.
              if (rows.length === 1 && /^\d{4}$/.test(rows[0].period) && pts.length > 10) {
                return <TrendChart key={id} name={ind?.name ?? id} points={pts} sc={rows[0]} from={1900} />;
              }
              const band = id === 'temp_anomaly_c_global' ? { from: 1.5, to: 2, label: 'Paris Agreement: 1.5 °C goal, 2 °C upper limit' } : undefined;
              return <ScenarioChart key={id} name={ind?.name ?? id} today={today} todayLabel={label} rows={rows} band={band} />;
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
              No later tournament has repeated its extinction question, so those figures are still the newest of their kind. The
              institute&apos;s mid-2026 panel asked about a global catastrophe, and its answers are shown beside the 2022 ones in that chart.
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
