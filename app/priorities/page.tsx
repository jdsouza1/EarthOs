import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/site/PageHeader';
import { KindBadge } from '@/components/ui/KindBadge';
import { MIN_LENSES, WeightedList, type Row } from '@/components/priorities/WeightedList';
import { AGREEMENT_MIN, getPriorities, LOOKBACK_LABEL, type Lens, type LookbackResult } from '@/lib/priorities';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Priorities — EarthOS' };

/** Short chip labels; a lens added to the data without one falls back to its full name. */
const SHORT: Record<string, string> = { deaths: 'Deaths', people: 'People', future: 'Future', experts: 'Experts', value: 'Value', worry: 'Worry', money: 'Money', list80k: '80k list' };
/** Starting points only: each is a named way of looking, not a recommendation. */
const PRESETS: { label: string; on: string[] }[] = [
  { label: 'Every lens equally', on: ['*'] },
  { label: 'Harm today', on: ['deaths', 'people'] },
  { label: 'Risk ahead', on: ['future', 'experts'] },
];

/** The priority formula: which lenses stand for how big, how neglected and how solvable a problem is. */
const FORMULA = { big: ['deaths', 'people', 'future', 'experts'], neglected: 'money', solvable: 'value' };

function Src({ name, url }: { name: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
      {name}
    </a>
  );
}

const LOOK_CLS: Record<LookbackResult, string> = {
  yes: 'border-good-line bg-good-bg/40 text-good',
  partly: 'border-warning-line bg-warning-bg/40 text-warning-text',
  no: 'border-critical-line bg-critical-bg/40 text-critical',
  untested: 'border-line text-subtle',
};

/** Flagged counts 1, partly counts a half; a lens is only scored on the events it could be tested on. */
function lookScore(l: Lens) {
  const tested = l.lookback.filter((x) => x.result !== 'untested');
  const hit = tested.reduce((n, x) => n + (x.result === 'yes' ? 1 : x.result === 'partly' ? 0.5 : 0), 0);
  return tested.length ? `Flagged ${hit} of ${tested.length} it could be tested on` : 'Could not be tested on either';
}

function Meter({ label, value, of, text }: { label: string; value: number; of: number; text: string }) {
  return (
    <div>
      <p className="tag text-[10px] text-subtle">{label}</p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" role="img" aria-label={text}>
        <div className="h-full rounded-full bg-accent" style={{ width: `${(value / of) * 100}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">{text}</p>
    </div>
  );
}

function LensCard({ l, total, name }: { l: Lens; total: number; name: (id: string) => string }) {
  return (
    <li id={l.id} className="card flex flex-col p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        {l.kinds.map((k) => (
          <KindBadge key={k} kind={k} />
        ))}
        <span className="tag text-[10px] text-subtle">{l.asOf}</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">{l.name}</h3>
      <p className="mt-1 text-sm text-muted">{l.question}</p>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line pt-3">
        <Meter label="Coverage" value={l.ranked.length} of={total} text={`Ranks ${l.ranked.length} of ${total} problems`} />
        {l.stability ? (
          <Meter label="Stability" value={l.stability.stable} of={l.stability.pairs} text={`${l.stability.stable} of ${l.stability.pairs} pairs keep their order`} />
        ) : (
          <div>
            <p className="tag text-[10px] text-subtle">Stability</p>
            <p className="mt-1 text-xs text-muted">Not tested: the source publishes positions, not figures that can be varied.</p>
          </div>
        )}
      </div>
      {l.stability && <p className="mt-2 text-xs text-subtle">Test: {l.stability.rule}</p>}

      <ol className="mt-4 flex flex-col gap-2 border-t border-line pt-3">
        {l.ranked.map((e) => (
          <li key={e.problemId} className="flex gap-3">
            <span className="w-6 shrink-0 font-mono text-sm font-bold text-ink-2">
              {e.rank}
              {e.tied ? '=' : ''}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-ink">
                {name(e.problemId)} <span className="font-mono font-bold text-ink-2">{e.display}</span>
                {e.partial && <span className="tag ml-1.5 whitespace-nowrap rounded border border-line px-1.5 py-0.5 text-[10px] text-subtle" title="This figure covers only part of the money going to the problem; see the note under it.">Partial scope</span>}
              </p>
              <p className="text-xs text-subtle">
                {e.detail}
                {l.source ? '' : (
                  <>
                    {' '}· <KindBadge kind={e.kind} /> {e.year} · <Src {...e.source} />
                  </>
                )}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {l.unranked.length > 0 && (
        <details className="mt-3 border-t border-line pt-3">
          <summary className="cursor-pointer text-xs text-accent">No figure for {l.unranked.length} {l.unranked.length === 1 ? 'problem' : 'problems'}, and why</summary>
          <ul className="mt-2 flex flex-col gap-1.5 text-xs text-muted">
            {l.unranked.map((u) => (
              <li key={u.problemId}>
                <span className="text-ink-2">{name(u.problemId)}:</span> {u.note}
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-3 text-xs text-muted">{l.caveat}</p>
      <p className="mt-2 text-xs text-subtle">{l.source ? <Src {...l.source} /> : 'Sources are named on each row.'}</p>
    </li>
  );
}

export default async function PrioritiesPage() {
  const { problems, lenses, agreement, events } = await getPriorities();
  const name = (id: string) => problems.find((p) => p.id === id)?.name ?? id;
  const rows: Row[] = problems.map((p) => ({
    id: p.id,
    name: p.name,
    href: p.href,
    cells: lenses.map((l) => {
      const e = l.ranked.find((x) => x.problemId === p.id);
      return e ? { rank: e.rank, of: l.ranked.length, tied: e.tied, score: e.score } : null;
    }),
    ...agreement[p.id],
  }));
  const tabs = lenses.map((l) => ({ id: l.id, short: SHORT[l.id] ?? l.name, name: l.name, covered: l.ranked.length, total: problems.length }));
  const presets = PRESETS.map((p) => ({ label: p.label, weights: lenses.map((l) => (p.on.includes('*') || p.on.includes(l.id) ? 2 : 0)) }));
  const at = (id: string) => {
    const i = lenses.findIndex((l) => l.id === id);
    if (i < 0) throw new Error(`Priorities: the formula needs a lens called ${id}`);
    return i;
  };
  const formula = { big: FORMULA.big.map(at), neglected: at(FORMULA.neglected), solvable: at(FORMULA.solvable) };
  const tops = lenses.map((l) => `${l.name}: ${name(l.ranked[0].problemId)}`);
  const distinctTops = new Set(lenses.map((l) => l.ranked[0].problemId)).size;
  const skipped = lenses.filter((l) => !l.inAgreement);

  return (
    <>
      <PageHeader
        label="Priorities"
        title="Which problem comes first depends on how you measure it."
        summary={`${problems.length} problems ranked ${lenses.length} ways, each from a named source. The ${lenses.length} lenses put ${distinctTops} different problems first. EarthOS does not pick a winner: the weights are yours.`}
      />

      <section aria-labelledby="pri-yours" className="flex flex-col gap-3">
        <div>
          <h2 id="pri-yours" className="text-xl font-semibold text-ink">Your ranking</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Pick a starting point, or choose how much each lens counts. The small labels show where each problem sits in each lens, for example Deaths 1/6 means first of the 6 problems that lens can rank.
          </p>
        </div>
        <WeightedList rows={rows} lenses={tabs} presets={presets} formula={formula} />
      </section>

      <section aria-labelledby="pri-lenses" className="flex flex-col gap-3">
        <div>
          <h2 id="pri-lenses" className="text-xl font-semibold text-ink">The {lenses.length} lenses, and how far each one reaches</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Each lens answers one question with one source. Two checks sit on every card: coverage, how many of the {problems.length} problems it can rank at all, and stability, how much of its order survives if the figures are somewhat wrong.
          </p>
          <p className="mt-1 max-w-2xl text-xs text-subtle">First in each lens. {tops.join('. ')}.</p>
        </div>
        <ul className="grid gap-4 md:grid-cols-2" aria-label="Lenses">
          {lenses.map((l) => (
            <LensCard key={l.id} l={l} total={problems.length} name={name} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="pri-look" className="flex flex-col gap-3">
        <div>
          <h2 id="pri-look" className="text-xl font-semibold text-ink">Look-back test: what did each lens say at the start of 2020?</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Two large harms on this list came after 2020 began. This checks whether each lens, as it stood beforehand, pointed at them. Two events is a small test, so read it as a first check, not a score to rely on.
          </p>
        </div>
        <ul className="grid gap-3 md:grid-cols-2" aria-label="Events used in the look-back test">
          {events.map((ev) => (
            <li key={ev.id} className="panel p-4">
              <h3 className="text-sm font-semibold text-ink">{ev.name}</h3>
              <p className="mt-1 text-xs text-muted">{ev.what}</p>
              <p className="mt-1 text-xs text-subtle">
                <KindBadge kind={ev.kind} /> <Src {...ev.source} />
              </p>
            </li>
          ))}
        </ul>
        <ul className="grid gap-3 md:grid-cols-2" aria-label="Look-back result for each lens">
          {lenses.map((l) => (
            <li key={l.id} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-base font-semibold text-ink">{l.name}</h3>
                <span className="tag text-[10px] text-subtle">{lookScore(l)}</span>
              </div>
              <ul className="mt-2 flex flex-col gap-2">
                {l.lookback.map((x) => (
                  <li key={x.eventId} className="text-xs text-muted">
                    <span className={`tag mr-1.5 rounded border px-1.5 py-0.5 text-[10px] ${LOOK_CLS[x.result]}`}>{LOOKBACK_LABEL[x.result]}</span>
                    <span className="text-ink-2">{events.find((e) => e.id === x.eventId)?.name}.</span> {x.text}
                    {x.source && (
                      <>
                        {' '}
                        <Src {...x.source} />
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-5" aria-labelledby="pri-how">
        <h2 id="pri-how" className="eyebrow mb-2">How to read this page</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-5 text-xs text-muted">
          <li>The list of problems is fixed first, then every lens is applied to the same list. Where a lens has no figure for a problem it says so and gives the reason; nothing is estimated to fill a gap.</li>
          <li>Every figure is labelled measured, modelled or expert judgement and links to its source. The figures belong to the sources named, not to EarthOS.</li>
          <li>
            Your score: in each lens the top problem scores 100 and the bottom 0, spaced by position, and equal figures share a score. A problem&apos;s score is the weighted average over the lenses that rank it. A lens with no figure for a problem is left out of that problem&apos;s average, not counted as zero.
          </li>
          <li>
            The priority formula in the drop-down is one fixed rule, shown in full: how big × how neglected × how solvable, the three questions some research groups use to compare problems. Big is the average position across the four lenses about harm and risk; neglected comes from how little money goes to the problem; solvable comes from benefit per dollar, which covers only {lenses[formula.solvable].ranked.length} problems, all of them fixes that study rates as high-return, so a figure there can raise the factor above a neutral 50 but not lower it; for the rest it stays at 50. It is a rule, not a verdict, and a different rule gives a different order.
          </li>
          <li>
            Thin evidence is pulled toward the middle. If fewer than {MIN_LENSES} of the lenses you weighted have a figure for a problem, its score is topped up to {MIN_LENSES} with neutral scores of 50, so one or two lenses alone cannot put a problem first or last. Each row shows how many lenses its score uses and says when this was applied.
          </li>
          <li>
            &quot;Top 3 in&quot; counts only lenses that rank at least {AGREEMENT_MIN} problems{skipped.length ? ` (so ${skipped.map((l) => l.name.toLowerCase()).join(', ')} is left out of that count)` : ''}.
          </li>
          <li>Stability asks one thing: if the figures were off by the amount stated on the card, how many pairs of problems would still be in the same order? A low share means the order inside that lens should be held loosely.</li>
          <li>The look-back test uses only two events, both chosen after the fact, and a lens that warns about everything would pass it. Lenses that count present harm fail it by design: they are built to show what is happening now, not what is coming. A longer look back over past decades has not been done.</li>
          <li>
            No lens here measures how hard a problem is to solve or how neglected it is; no source covers all {problems.length} problems on that. Money spent against money needed is on <Link href="/funding" className="text-accent hover:underline">Funding</Link>, who can act is on{' '}
            <Link href="/levers" className="text-accent hover:underline">Levers</Link>, and the full expert estimates are on <Link href="/forecasts" className="text-accent hover:underline">Forecasts</Link>.
          </li>
        </ul>
      </section>
    </>
  );
}
