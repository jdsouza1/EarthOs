import Link from 'next/link';
import type { ReactNode } from 'react';
import type { BriefData } from '@/lib/brief';
import { PrintButton } from '@/components/report/PrintButton';
import { SubscribeBox } from '@/components/report/SubscribeBox';
import { NextStep } from '@/components/site/NextStep';

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
  if (!href) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-subtle underline decoration-line-strong underline-offset-2 hover:text-accent">
      {children}
    </a>
  );
}

const link = 'underline underline-offset-2 hover:text-accent';

/** One issue of the Brief. `archived` = a saved past issue: its numbers are as they stood that month. */
export function BriefView({ b, archived, picker }: { b: BriefData; archived: boolean; picker: ReactNode }) {
  const best = b.tiers[0];
  const worst = b.tiers.at(-1)!;
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-subtle">The Brief · {b.issueLabel}</p>
        <h1 className="leading-tight">Humanity&apos;s vital signs, in one short read.</h1>
        {archived ? (
          <p className="rounded-lg border border-warning-line bg-warning-bg/40 px-4 py-3 text-sm text-body">
            Archived issue. These are the numbers as they stood in {b.issueLabel} (data downloaded {b.issued}). Sources may have published newer or
            revised figures since. <Link href="/report" className={link}>Read the latest Brief</Link>.
          </p>
        ) : (
          <p className="text-lg text-muted">
            Written from the latest EarthOS data, downloaded {b.issued}. Every number is labelled measured, modelled or expert, and links to its source.
          </p>
        )}
        <p className="border-l-2 border-accent pl-4 text-body">
          <span className="font-semibold text-ink">Why EarthOS exists:</span> we all want the same thing, to survive. More than 99% of all species that have
          ever lived on Earth are extinct (<Source href="https://www.nationalgeographic.com/science/prehistoric-world/mass-extinction/">National Geographic</Source>).
          Beating those odds starts with agreeing on where we stand, so EarthOS paints the whole picture and points to what would help.
        </p>
        <div className="flex flex-wrap items-end gap-3 print:hidden">
          {picker}
          <PrintButton />
        </div>
      </header>

      <Section id="brief-hello" kicker="Good morning" title={`${best.name} leads at ${best.score}. ${worst.name} trails at ${worst.score}.`}>
        <p className="text-body">EarthOS scores four areas from 0 to 100, built from {b.indicatorCount} measured indicators. Here is where each one stands, best first.</p>
        <ul className="flex flex-col">
          {b.tiers.map((t) => (
            <li key={t.id} className="flex items-baseline gap-3 border-t border-line py-2.5 first:border-t-0">
              <span className="flex-1 text-ink">{t.name}</span>
              <span className="font-mono text-lg font-bold text-ink">{t.score}</span>
              <span className="w-28 text-right text-sm text-muted">{t.status}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-subtle">
          Scores are an EarthOS calculation, not a forecast. They move with the scoring rules: <Link href="/methodology#scoring" className={link}>see the ranges</Link>.
        </p>
      </Section>

      {b.alert && (
        <Section id="brief-bad" kicker="Bad news first" title={`${b.alert.name}: ${b.alert.valueText}.`}>
          <p className="text-body">
            This is the indicator whose score fell the most over the past year. {b.alert.changeText} Measured. <Source href={b.alert.sourceUrl}>{b.alert.sourceName}</Source>
          </p>
          {b.warming && (
            <p className="text-body">
              For context: the 12-month average for {b.warming.name.toLowerCase()} is about {b.warming.levelText} against a limit of {b.warming.limitText} ({b.warming.label}). One hot month or year is not a breach; the limit refers to warming averaged over decades.
            </p>
          )}
        </Section>
      )}

      <Section id="brief-weak" kicker="The weak spots" title="The lowest scores, and who can move them">
        <ol className="flex flex-col gap-4">
          {b.weakest.map((w) => (
            <li key={w.name} className="flex flex-col gap-1">
              <p className="text-ink">
                <span className="font-semibold">{w.name}</span> <span className="font-mono text-sm text-muted">score {w.score}</span>
              </p>
              {w.latestText && (
                <p className="text-sm text-body">
                  Latest: {w.latestText}. Measured. <Source href={w.sourceUrl}>{w.sourceName}</Source>
                </p>
              )}
              {w.lever && (
                <p className="text-sm text-body">
                  One lever: {w.lever.text}. Who: {w.lever.who}. <Source href={w.lever.sourceUrl}>{w.lever.sourceName}</Source>
                </p>
              )}
            </li>
          ))}
        </ol>
        <p className="text-sm text-subtle">
          More on each in <Link href="/levers" className={link}>Levers</Link>.
        </p>
      </Section>

      {b.gains.length > 0 && (
        <Section id="brief-good" kicker="Good news" title="What got better over 10 years">
          <ul className="flex flex-col gap-3">
            {b.gains.map((g) => (
              <li key={g.id} className="text-body">
                <span className="font-semibold text-ink">{g.name}:</span> {g.latestText}, {g.changeText}. Measured. <Source href={g.sourceUrl}>{g.sourceName}</Source>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="brief-policy" kicker="Policy pulse" title="One number from each policy topic">
        <ul className="flex flex-col">
          {b.policy.map((p) => (
            <li key={p.topicId} className="flex flex-col gap-0.5 border-t border-line py-3 first:border-t-0">
              <span className="text-xs uppercase tracking-widest text-subtle">{p.topicLabel}</span>
              <span className="text-ink">
                {p.label}: <span className="font-mono font-bold">{p.value}</span> <span className="text-muted">{p.context}</span>
              </span>
              <span className="text-sm text-subtle">
                {p.confidence}. <Source href={p.sourceUrl}>{p.sourceName}</Source>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-subtle">
          Country ratings and gameplans are in <Link href="/policies" className={link}>Policies</Link>. See what changes if the world acts in <Link href="/what-if" className={link}>What if</Link>. Proof it can be done: <Link href="/solved" className={link}>Solved</Link>.
        </p>
      </Section>

      {b.forecast && (
        <Section id="brief-forecast" kicker="Forecast corner" title={`Human extinction by 2100: ${b.forecast.lo} to ${b.forecast.hi}.`}>
          <p className="text-body">
            That is the lowest and highest of {b.forecast.count} published estimates from forecasters and domain experts. They are expert judgement, not measurement, and EarthOS never averages them or adds a figure of its own.{' '}
            <Link href="/forecasts" className={link}>All forecasts</Link>
          </p>
        </Section>
      )}

      <SubscribeBox />

      <NextStep from="/report" />

      <footer className="border-t border-line pt-4 text-sm text-subtle">
        The Brief is generated from EarthOS data each month and saved to the archive. How the scores work: <Link href="/methodology" className={link}>Methodology</Link>. What changed: <Link href="/changelog" className={link}>Change log</Link>. Printed from https://earth-os-blond.vercel.app/report{archived ? `/${b.key}` : ''}
      </footer>
    </article>
  );
}
