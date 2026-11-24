import Link from 'next/link';
import { type GameplanStep, type MasterStep, type PolicyRating } from '@/lib/policies';
import { InfoTip } from '@/components/ui/InfoTip';
import { Collapsible } from '@/components/ui/Collapsible';
import { ViewToggle } from '@/components/ui/ViewToggle';
import { formatShare } from '@/lib/emissions';
import { RATING, slug } from './rating';

/** Master steps with the countries that need each, ranked by the share of world emissions from those countries. */
export function rankMaster(master: MasterStep[], plans: Map<string, GameplanStep[]>, countries: PolicyRating[]) {
  const withPlans = countries.filter((c) => (plans.get(c.iso3)?.length ?? 0) > 0);
  return master
    .map((m) => {
      const who = withPlans.filter((c) => plans.get(c.iso3)!.some((s) => s.theme === m.theme));
      return { ...m, who, share: who.reduce((t, c) => t + (c.emissions?.share ?? 0), 0) };
    })
    .filter((m) => m.who.length > 0)
    .sort((a, b) => b.share - a.share || b.who.length - a.who.length);
}

/** The shared steps across all country gameplans, ranked by the share of world emissions from the countries that need each. */
export function MasterPlan({
  master,
  plans,
  countries,
  detailThemes = [],
}: {
  master: MasterStep[];
  plans: Map<string, GameplanStep[]>;
  countries: PolicyRating[];
  /** Themes that have a detailed step page. */
  detailThemes?: string[];
}) {
  const withPlans = countries.filter((c) => (plans.get(c.iso3)?.length ?? 0) > 0);
  const rows = rankMaster(master, plans, countries);

  const byShare = (a: PolicyRating, b: PolicyRating) => (b.emissions?.share ?? 0) - (a.emissions?.share ?? 0);
  const cols = [...withPlans].sort(byShare);
  const needs = new Map(rows.map((m) => [m.theme, new Set(m.who.map((c) => c.iso3))]));
  const grid = { gridTemplateColumns: `minmax(9rem,13rem) ${cols.map((c) => `minmax(14px,${Math.max(c.emissions?.share ?? 0, 0.8)}fr)`).join(' ')} 3.25rem` };

  const tip =
    'pointer-events-none absolute z-40 hidden whitespace-nowrap rounded border border-line-strong bg-surface px-2.5 py-1.5 text-left font-mono text-[11px] font-normal leading-snug shadow-xl group-hover:block group-focus-visible:block';
  const tipX = (i: number) =>
    i < 2 ? 'left-0' : i >= cols.length - 3 ? 'right-0' : 'left-1/2 -translate-x-1/2';

  const matrix = (
    <figure>
      <div className="overflow-x-auto md:overflow-visible">
        <div className="min-w-[560px] md:min-w-0">
          <div className="grid items-end gap-px pb-1" style={grid}>
            <span className="tag text-[9px] text-subtle">Step ↓ · Country →</span>
            {cols.map((c, ci) => (
              <Link
                key={c.iso3}
                href={`/policies/${slug(c.iso3)}`}
                aria-label={`${c.country}: ${formatShare(c.emissions?.share ?? 0)} of world emissions`}
                className="group relative flex justify-center font-mono text-[9px] text-subtle hover:text-ink-2"
              >
                <span className="[writing-mode:vertical-rl] rotate-180">{c.iso3}</span>
                <span role="tooltip" className={`${tip} ${tipX(ci)} bottom-full mb-1`}>
                  <span className="block font-sans font-bold text-ink">{c.country}</span>
                  <span className="block text-body">{formatShare(c.emissions?.share ?? 0)} of world emissions</span>
                </span>
              </Link>
            ))}
            <span className="text-right font-mono text-[9px] text-subtle">impact</span>
          </div>
          {rows.map((m, i) => (
            <div key={m.theme} className="grid items-center gap-px" style={grid}>
              <span className="truncate pr-2 text-xs font-bold text-ink-2" title={m.title}>
                <span className="mr-1.5 font-mono text-subtle">{i + 1}</span>
                {m.title}
              </span>
              {cols.map((c, ci) => {
                const on = needs.get(m.theme)!.has(c.iso3);
                const cs = c.emissions?.share ?? 0;
                const ofStep = m.share > 0 ? (cs / m.share) * 100 : 0;
                return on ? (
                  <Link
                    key={c.iso3}
                    href={`/policies/${slug(c.iso3)}`}
                    aria-label={`${c.country}: ${Math.round(ofStep)}% of this step's impact, ${formatShare(cs)} of world emissions`}
                    className="group relative h-6 rounded-sm bg-accent/80 hover:bg-accent-strong"
                  >
                    <span role="tooltip" className={`${tip} ${tipX(ci)} bottom-full mb-1.5`}>
                      <span className="block font-sans font-bold text-ink">{c.country}</span>
                      <span className="block text-body">
                        {ofStep < 1 ? '<1' : Math.round(ofStep)}% of impact · {formatShare(cs)} world
                      </span>
                    </span>
                  </Link>
                ) : (
                  <span key={c.iso3} className="h-6 rounded-sm bg-line/50" />
                );
              })}
              <span className="text-right font-mono text-[10px] text-body">{formatShare(m.share)}</span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-[10px] text-muted">
        Each column is a country, as wide as its share of world emissions (biggest on the left). A filled square means
        that country still needs to take that step. Hover a square to see that country&apos;s share of the step; click to open the country&apos;s plan.
      </figcaption>
    </figure>
  );

  const titleOf = new Map(rows.map((m, i) => [m.theme, { title: m.title, rank: i + 1 }]));
  const maxShare = Math.max(1, ...cols.map((c) => c.emissions?.share ?? 0));
  const countryView = (
    <ol className="flex flex-col divide-y divide-line">
      {cols.map((c) => {
        const steps = (plans.get(c.iso3) ?? [])
          .map((s) => s.theme)
          .filter((t, i, arr) => arr.indexOf(t) === i)
          .map((t) => titleOf.get(t)!)
          .filter(Boolean)
          .sort((x, y) => x.rank - y.rank);
        return (
          <li key={c.iso3} className="grid gap-2 py-2 md:grid-cols-[13rem_1fr] md:items-center">
            <Link href={`/policies/${slug(c.iso3)}`} className="group flex flex-col gap-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-bold text-ink group-hover:underline">{c.country}</span>
                <span className="font-mono text-[10px] text-body">{formatShare(c.emissions?.share ?? 0)}</span>
              </span>
              <span className="h-1 overflow-hidden rounded-full bg-line">
                <span className="block h-full rounded-full bg-muted" style={{ width: `${Math.max(((c.emissions?.share ?? 0) / maxShare) * 100, 1)}%` }} />
              </span>
              <span className={`tag self-start rounded border px-1.5 py-0.5 text-[9px] ${RATING[c.rating].cls}`}>{c.rating}</span>
            </Link>
            <div className="flex flex-wrap gap-1">
              {steps.map((s) => (
                <span key={s.rank} className="tag rounded border border-line-strong px-1.5 py-0.5 text-[10px] text-body">
                  <span className="mr-1 text-subtle">{s.rank}</span>
                  {s.title}
                </span>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );

  return (
    <Collapsible
      id="master-body"
      label="who needs each step"
      defaultOpen={false}
      header={
        <>
          <h2 className="text-sm font-bold text-body">Who needs each step</h2>
          <InfoTip id="master-about" label="About who needs each step" align="left">
            Every country gameplan below is built from these shared steps. Each step lists the countries whose plan includes
            it. Steps are ranked by impact: the share of world greenhouse gas emissions produced by the countries that still
          need to take that step. A step China needs outranks one that many small emitters need.
          </InfoTip>
        </>
      }
    >
      <p className="mb-4 max-w-3xl text-xs text-muted">
        What the world needs to do, ranked by impact: how much of world emissions comes from the countries that still need to do it. Click a
        country to see its full plan.
      </p>
      <ViewToggle
        label="Master gameplan"
        views={[
          {
            key: 'list',
            label: 'List',
            icon: 'list',
            content: (
          <ol className="flex flex-col gap-2">
            {rows.map((m, i) => (
              <li key={m.theme} className={`card relative flex flex-col gap-2 p-3 md:flex-row md:items-center md:gap-4 ${detailThemes.includes(m.theme) ? 'hover:brightness-110' : ''}`}>
                <div className="flex min-w-0 flex-1 gap-3">
                  <span className="w-5 shrink-0 font-mono text-sm font-bold text-subtle">{i + 1}</span>
                  <div className="min-w-0">
                    {detailThemes.includes(m.theme) ? (
                      <Link href={`/policies/steps/${m.theme}`} className="text-sm font-bold text-ink-2 after:absolute after:inset-0 hover:underline">
                        {m.title} <span className="tag text-[10px] font-normal text-accent">Detailed steps →</span>
                      </Link>
                    ) : (
                      <div className="text-sm font-bold text-ink-2">{m.title}</div>
                    )}
                    {m.why && <p className="text-xs text-muted">{m.why}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-1 md:w-[22rem] md:items-end">
                  <span className="tag text-[10px] text-subtle">
                    {m.share > 0 && <><b className="text-body">{formatShare(m.share)}</b> of world emissions · </>}
                    {m.who.length} of {withPlans.length} countries
                  </span>
                  <div className="flex flex-wrap gap-1 md:justify-end">
                    {m.who.map((c) => (
                      <Link
                        key={c.iso3}
                        href={`/policies/${slug(c.iso3)}`}
                        title={`${c.country}: ${c.rating}`}
                        className={`tag relative z-10 rounded border px-1.5 py-0.5 text-[10px] hover:brightness-125 ${RATING[c.rating].cls}`}
                      >
                        {c.iso3}
                      </Link>
                    ))}
                  </div>
                </div>
              </li>
            ))}
          </ol>
            ),
          },
          { key: 'matrix', label: 'Matrix', icon: 'matrix', content: matrix },
          { key: 'countries', label: 'By country', icon: 'countries', content: countryView },
        ]}
      />
    </Collapsible>
  );
}
