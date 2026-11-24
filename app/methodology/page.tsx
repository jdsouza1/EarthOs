import type { Metadata } from 'next';
import { DATASET_GROUPS, getMethodologyData, type DatasetStatus } from '@/lib/methodology';
import { METHOD_VERSION } from '@/lib/scores';
import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/site/PageHeader';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Methodology — EarthOS' };

const STATUS_STYLE: Record<DatasetStatus, { label: string; cls: string }> = {
  real: { label: 'Real', cls: 'border-good-line bg-good-bg/40 text-good' },
  mixed: { label: 'Mixed', cls: 'border-warning-line bg-warning-bg/40 text-warning-text' },
  illustrative: { label: 'Illustrative', cls: 'border-warning-line bg-warning-bg/40 text-warning-text' },
  missing: { label: 'Not created yet', cls: 'border-line-strong bg-surface text-muted' },
  retired: { label: 'Not shown', cls: 'border-line-strong bg-surface text-subtle' },
};

const SCORING: [string, string, string][] = [
  ['Official target', 'How far it has come from its baseline year toward the target.', 'Share of the distance from the baseline year to the target already covered. 0 if it has moved away, 100 when reached. Used for poverty, hunger, child mortality, internet, electricity and clean-cooking access, vaccination, nuclear warheads and asteroid detection.'],
  ['Limit', 'How much room is left under the limit.', 'Headroom left under the limit. Used for temperature: about 1.46 of 1.5 °C used scores about 3.'],
  ['10-year trend', 'Where there is no target: 50 means no change.', 'Where no official target exists: 50 means no change over 10 years; each 1% change in the better direction adds 5 points, each 1% in the worse direction takes 5 away (capped 0–100). Monthly series compare 12-month averages to remove seasons.'],
  ['Not scored', 'Shown, but with no agreed better direction.', 'Indicators with no agreed better direction, such as private AI investment, are shown but not scored.'],
  ['Range for each area', 'The score worked out again under other reasonable choices.', 'The area score is recomputed under every reasonable variant of the method: a 5, 10 or 15-year trend window; 2.5, 5 or 10 points per 1% change; and leaving out each indicator in turn. The Dashboard shows the lowest and highest result for the latest year under each area score. Past years are worked out the same way, with only the data published by then. A wide range means the score depends heavily on our choices or on one indicator. It does not include measurement error in the source data.'],
  ['Known limits', 'What the scores do not tell you.', 'Trend scores say whether things are improving, not whether they are good enough, and the Existential tier is still weighted toward climate (four of its six indicators). Method v1 (18 Nov) scored these indicators against their own record instead; see the change log.'],
];

const PRINCIPLES: [string, string, string][] = [
  ['Every number has a source', 'Each figure names where it came from and links to it.', 'Every figure, rating and estimate on the site names its source, and the build fails if a source is missing.'],
  ['Labelled by confidence', 'Measured, modelled or expert judgement.', 'Measured: counted or recorded. Modelled: the output of a published model, so it depends on the model’s assumptions. Expert judgement: an estimate by named experts, shown as they gave it.'],
  ['Every row is labelled', 'Placeholder data is flagged, never hidden.', 'Each data row carries an is_illustrative flag. While any displayed row is a placeholder, the header shows "Illustrative data — not a real estimate".'],
  ['Bad data never ships', 'A broken data file stops the site from updating.', 'The site is rebuilt from these files on every update. A missing column, an out-of-range score or an unknown tier stops the build, naming the file and line.'],
  ['Existing ratings over our own', 'Countries are rated by independent trackers.', 'Where established trackers rate countries or policies, EarthOS shows their ratings and names them, rather than inventing its own.'],
  ['No survival percentage of our own', 'Only published expert estimates, side by side.', 'EarthOS does not calculate a probability that humanity survives. The Forecasts page shows published expert estimates side by side instead, never averaged. Anything EarthOS calculates itself must be checkable against real data later. Downloaded data is stored as published, and scores are computed from it by a documented method, never typed in by hand.'],
];

function Row({ title, short, children }: { title: string; short?: string; children: ReactNode }) {
  return (
    <details className="group border-t border-line first:border-t-0">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] font-semibold text-ink">{title}</span>
          {short && <span className="text-sm text-muted">{short}</span>}
        </span>
        <ChevronDown size={16} className="mt-1 shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="pb-4 text-sm text-muted">{children}</div>
    </details>
  );
}

export default async function MethodologyPage() {
  const datasets = await getMethodologyData();

  return (
    <>
      <PageHeader
        label="Methodology"
        title="How every number is made."
        summary="Six rules, then the scoring method and the data files. Tap any item for the detail. This page is generated from the data files themselves, so it always matches what is shown."
      />

      <section id="illustrative" aria-labelledby="rules-title" className="flex flex-col gap-3">
        <h2 id="rules-title" className="eyebrow">Rules</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map(([title, short, body]) => (
            <li key={title} className="card p-4">
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-col gap-1 [&::-webkit-details-marker]:hidden">
                  <span className="text-[15px] font-semibold text-ink">{title}</span>
                  <span className="text-sm text-muted">{short}</span>
                </summary>
                <p className="mt-2 border-t border-line pt-2 text-sm text-muted">{body}</p>
              </details>
            </li>
          ))}
        </ol>
      </section>

      <section id="scoring" className="panel p-5" aria-labelledby="scoring-title">
        <h2 id="scoring-title" className="eyebrow">How scores are worked out</h2>
        <p className="mb-1 mt-1 max-w-3xl text-sm text-muted">
          Each indicator is scored 0 to 100, where 100 is the good end. An area&apos;s score is the plain average of its scored indicators, except that indicators measuring the same thing count once: since method v3 (24 Nov 2026), carbon dioxide, methane and nitrous oxide are averaged into one greenhouse-gas item before the Existential Survival average, so the tier gives equal weight to temperature, greenhouse gases, nuclear weapons and asteroids. The three gases still show as separate cards.
          Past years use only the data available then. Method {METHOD_VERSION}.
        </p>
        <div className="flex flex-col">
          {SCORING.map(([title, short, body]) => (
            <Row key={title} title={title} short={short}>
              {body}
            </Row>
          ))}
        </div>
      </section>

      <section className="panel p-5" aria-labelledby="files-title">
        <h2 id="files-title" className="eyebrow">Data files</h2>
        <p className="mb-1 mt-1 text-sm text-muted">{datasets.length} files, every one the site is built from. Tap one for what it feeds, how it is made and its sources.</p>
        {DATASET_GROUPS.map((g) => {
          const files = datasets.filter((d) => d.group === g);
          if (files.length === 0) return null;
          return (
            <div key={g} className="mt-4">
              <h3 className="mb-1 text-sm font-semibold text-subtle">{g}</h3>
              <div className="flex flex-col">
                {files.map((d) => {
                  const st = STATUS_STYLE[d.status];
                  const shown = d.sources.slice(0, 6);
                  const more = d.sources.length - shown.length;
                  return (
                    <details key={d.file} className="group border-t border-line">
                      <summary className="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[15px] text-ink">{d.title}</span>
                          <span className="font-mono text-[11px] text-subtle">data/{d.file}</span>
                        </span>
                        {d.status !== 'missing' && (
                          <span className="hidden font-mono text-[11px] text-subtle sm:inline">
                            {d.rows.toLocaleString('en-US')} rows{d.illustrativeRows > 0 && ` · ${d.illustrativeRows} illustrative`}
                          </span>
                        )}
                        <span className={`shrink-0 rounded border px-2 py-0.5 text-[11px] ${st.cls}`}>{st.label}</span>
                        <ChevronDown size={16} className="shrink-0 text-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
                      </summary>
                      <dl className="mb-3 grid gap-x-4 gap-y-1 text-sm md:grid-cols-[6rem_1fr]">
                        <dt className="text-subtle">Feeds</dt>
                        <dd className="text-body">{d.feeds}</dd>
                        <dt className="text-subtle">Method</dt>
                        <dd className="text-muted">{d.method}</dd>
                        {shown.length > 0 && (
                          <>
                            <dt className="text-subtle">Sources</dt>
                            <dd className="text-muted">
                              {shown.map((src, i) => (
                                <span key={src.name}>
                                  {i > 0 && ', '}
                                  {src.url ? (
                                    <a href={src.url} className="text-accent underline-offset-2 hover:underline" target="_blank" rel="noreferrer">
                                      {src.name}
                                    </a>
                                  ) : (
                                    src.name
                                  )}
                                </span>
                              ))}
                              {more > 0 && <span>, and {more} more named on the pages that use them</span>}
                            </dd>
                          </>
                        )}
                      </dl>
                    </details>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}
