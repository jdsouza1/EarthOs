import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getDashboardData } from '@/lib/data';
import { getIndicators, type Indicator } from '@/lib/indicators';
import { getLevers } from '@/lib/levers';
import { getKeyNumbers } from '@/lib/keyNumbers';
import { getExpertForecasts } from '@/lib/forecasts';
import { POLICY_TOPICS } from '@/lib/policyTopics';
import { PrintButton } from '@/components/report/PrintButton';
import { SubscribeBox } from '@/components/report/SubscribeBox';

// Built at deploy time from the same data files as the rest of the site, so the Brief is always as current as the dashboard.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'The Brief — EarthOS',
  description: "A short read on humanity's vital signs, written from the latest EarthOS data.",
};

const LONG_MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const SHORT_MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const when = (annual: boolean, date: string) => (annual ? date.slice(0, 4) : SHORT_MONTH.format(new Date(date)));

function num(v: number) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (a >= 1000) return Math.round(v).toLocaleString('en-US');
  if (a >= 100) return v.toFixed(1);
  return String(Number(v.toFixed(2)));
}

/** A value with its unit: no space before a % unit ("85% of people"). */
const withUnit = (v: number, unit: string) => (unit.startsWith('%') ? `${num(v)}${unit}` : `${num(v)} ${unit}`);

/** A 10-year change in words: points for shares ("+33.7 points"), a relative change otherwise ("down 84%"). */
function changeText(i: Indicator, g: number) {
  const d = i.change10y!;
  if (i.unit.startsWith('%')) return `${d > 0 ? 'up' : 'down'} ${num(Math.abs(d))} points in 10 years`;
  return `${d > 0 ? 'up' : 'down'} ${Math.round(Math.abs(g))}% in 10 years`;
}

function pct(v: number) {
  if (v >= 10) return `${Math.round(v)}%`;
  if (v >= 1) return `${Number(v.toFixed(2))}%`;
  return `${Number(v.toPrecision(2))}%`;
}

/** 10-year change in the indicator's better direction, as a percentage of its value 10 years ago. Null if it cannot be judged. */
function gain(i: Indicator): number | null {
  const better = i.target?.better;
  if (!better || better === 'none' || i.change10y === null) return null;
  const before = i.latest.value - i.change10y;
  if (before === 0) return null;
  const change = (i.change10y / Math.abs(before)) * 100;
  return better === 'higher' ? change : -change;
}

const LABEL = { measured: 'Measured', modelled: 'Modelled', expert: 'Expert' } as const;

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 border-t border-line pt-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">{kicker}</p>
      <h2 id={id} className="text-2xl leading-tight">{title}</h2>
      {children}
    </section>
  );
}

function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-subtle underline decoration-line-strong underline-offset-2 hover:text-accent">
      {children}
    </a>
  );
}

export default async function BriefPage() {
  const [data, indicators, levers, forecasts, keyNumbers] = await Promise.all([
    getDashboardData(),
    getIndicators(),
    getLevers(),
    getExpertForecasts(),
    Promise.all(POLICY_TOPICS.filter((t) => t.href).map(async (t) => ({ topic: t, first: (await getKeyNumbers(t.id))[0] }))),
  ]);

  const issued = indicators.map((i) => i.retrievedAt).sort().at(-1) ?? '';
  const issue = issued ? LONG_MONTH.format(new Date(issued)) : '';
  const tiers = [...data.tiers].sort((a, b) => b.score - a.score);
  const best = tiers[0];
  const worst = tiers.at(-1)!;
  const byName = new Map(indicators.map((i) => [i.name, i]));

  const alert = data.alerts[0];
  const weakest = data.bottlenecks.slice(0, 3).map((b) => {
    const ind = byName.get(b.name);
    return { b, ind, lever: ind ? levers.get(ind.id)?.[0] : undefined };
  });
  const gains = indicators
    .map((i) => ({ i, g: gain(i) }))
    .filter((x): x is { i: Indicator; g: number } => x.g !== null && x.g > 0)
    .sort((a, b) => b.g - a.g)
    .slice(0, 3);
  const ext = forecasts.filter((f) => f.outcome === 'extinction' && f.risk === 'All causes' && f.horizon === '2100');
  const extLo = ext.length ? Math.min(...ext.map((f) => f.value)) : null;
  const extHi = ext.length ? Math.max(...ext.map((f) => f.value)) : null;
  const warming = indicators.find((i) => i.target?.kind === 'limit' && i.target.level !== null);

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-subtle">The Brief{issue && <> · {issue}</>}</p>
        <h1 className="leading-tight">Humanity&apos;s vital signs, in one short read.</h1>
        <p className="text-lg text-muted">
          Written from the latest EarthOS data, downloaded {issued}. Every number is labelled measured, modelled or expert, and links to its source.
        </p>
        <p className="border-l-2 border-accent pl-4 text-body">
          <span className="font-semibold text-ink">Why EarthOS exists:</span> we all want the same thing, to survive. More than 99% of all species that have
          ever lived on Earth are extinct (<Source href="https://www.nationalgeographic.com/science/prehistoric-world/mass-extinction/">National Geographic</Source>).
          Beating those odds starts with agreeing on where we stand, so EarthOS paints the whole picture and points to what would help.
        </p>
        <div className="flex flex-wrap gap-3 print:hidden">
          <PrintButton />
        </div>
      </header>

      <Section id="brief-hello" kicker="Good morning" title={`${best.name} leads at ${best.score}. ${worst.name} trails at ${worst.score}.`}>
        <p className="text-body">
          EarthOS scores four areas from 0 to 100, built from {indicators.length} measured indicators. Here is where each one stands, best first.
        </p>
        <ul className="flex flex-col">
          {tiers.map((t) => (
            <li key={t.id} className="flex items-baseline gap-3 border-t border-line py-2.5 first:border-t-0">
              <span className="flex-1 text-ink">{t.name}</span>
              <span className="font-mono text-lg font-bold text-ink">{t.score}</span>
              <span className="w-28 text-right text-sm text-muted">{t.status}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-subtle">
          Scores are an EarthOS calculation, not a forecast. They move with the scoring rules: <Link href="/methodology#scoring" className="underline underline-offset-2 hover:text-accent">see the ranges</Link>.
        </p>
      </Section>

      {alert && (
        <Section id="brief-bad" kicker="Bad news first" title={`${alert.name}: ${withUnit(alert.latest.value, alert.unit)}.`}>
          <p className="text-body">
            This is the indicator whose score fell the most over the past year.
            {alert.change1y !== null && <> It is {alert.change1y >= 0 ? 'up' : 'down'} {withUnit(Math.abs(alert.change1y), alert.unit)} on a year earlier ({when(alert.annual, alert.latest.date)}).</>}{' '}
            Measured. <Source href={alert.sourceUrl}>{alert.source}</Source>
          </p>
          {warming?.target?.level != null && warming.target.limit != null && (
            <p className="text-body">
              For context: the 12-month average for {warming.name.toLowerCase()} is about {withUnit(warming.target.level, warming.unit)} against a limit of {withUnit(warming.target.limit, warming.unit)} ({warming.target.label}). One hot month or year is not a breach; the limit refers to warming averaged over decades.
            </p>
          )}
        </Section>
      )}

      <Section id="brief-weak" kicker="The weak spots" title="The lowest scores, and who can move them">
        <ol className="flex flex-col gap-4">
          {weakest.map(({ b, ind, lever }) => (
            <li key={b.name} className="flex flex-col gap-1">
              <p className="text-ink">
                <span className="font-semibold">{b.name}</span>{' '}
                <span className="font-mono text-sm text-muted">score {Math.round(b.score)}</span>
              </p>
              {ind && (
                <p className="text-sm text-body">
                  Latest: {withUnit(ind.latest.value, ind.unit)} ({when(ind.annual, ind.latest.date)}). Measured. <Source href={ind.sourceUrl}>{ind.source}</Source>
                </p>
              )}
              {lever && (
                <p className="text-sm text-body">
                  One lever: {lever.lever}. Who: {lever.who.join('; ')}. <Source href={lever.sourceUrl}>{lever.source}</Source>
                </p>
              )}
            </li>
          ))}
        </ol>
        <p className="text-sm text-subtle">
          More on each in <Link href="/levers" className="underline underline-offset-2 hover:text-accent">Levers</Link>.
        </p>
      </Section>

      {gains.length > 0 && (
        <Section id="brief-good" kicker="Good news" title="What got better over 10 years">
          <ul className="flex flex-col gap-3">
            {gains.map(({ i, g }) => (
              <li key={i.id} className="text-body">
                <span className="font-semibold text-ink">{i.name}:</span> {withUnit(i.latest.value, i.unit)} ({when(i.annual, i.latest.date)}), {changeText(i, g)}. Measured.{' '}
                <Source href={i.sourceUrl}>{i.source}</Source>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="brief-policy" kicker="Policy pulse" title="One number from each policy topic">
        <ul className="flex flex-col">
          {keyNumbers
            .filter((k) => k.first)
            .map(({ topic, first }) => (
              <li key={topic.id} className="flex flex-col gap-0.5 border-t border-line py-3 first:border-t-0">
                <span className="text-xs uppercase tracking-widest text-subtle">{topic.label}</span>
                <span className="text-ink">
                  {first!.label}: <span className="font-mono font-bold">{first!.value}</span> <span className="text-muted">{first!.context}</span>
                </span>
                <span className="text-sm text-subtle">
                  {LABEL[first!.confidence as keyof typeof LABEL] ?? first!.confidence}. <Source href={first!.sourceUrl}>{first!.sourceName}</Source>
                </span>
              </li>
            ))}
        </ul>
        <p className="text-sm text-subtle">
          Country ratings and gameplans are in <Link href="/policies" className="underline underline-offset-2 hover:text-accent">Policies</Link>. See what changes if the world acts in <Link href="/what-if" className="underline underline-offset-2 hover:text-accent">What if</Link>. Proof it can be done: <Link href="/solved" className="underline underline-offset-2 hover:text-accent">Solved</Link>.
        </p>
      </Section>

      {extLo !== null && extHi !== null && (
        <Section id="brief-forecast" kicker="Forecast corner" title={`Human extinction by 2100: ${pct(extLo)} to ${pct(extHi)}.`}>
          <p className="text-body">
            That is the lowest and highest of {ext.length} published estimates from forecasters and domain experts. They are expert judgement, not measurement, and EarthOS never averages them or adds a figure of its own.{' '}
            <Link href="/forecasts" className="underline underline-offset-2 hover:text-accent">All forecasts</Link>
          </p>
        </Section>
      )}

      <SubscribeBox />

      <footer className="border-t border-line pt-4 text-sm text-subtle">
        The Brief is generated from EarthOS data each time the site updates. How the scores work: <Link href="/methodology" className="underline underline-offset-2 hover:text-accent">Methodology</Link>. What changed: <Link href="/changelog" className="underline underline-offset-2 hover:text-accent">Change log</Link>. Printed from https://earth-os-blond.vercel.app/report
      </footer>
    </article>
  );
}
