'use client';

import Link from 'next/link';
import { useState } from 'react';

export interface Cell {
  rank: number;
  of: number;
  tied: boolean;
  score: number;
}
export interface Row {
  id: string;
  name: string;
  href: string | null;
  /** One entry per lens, in lens order; null where the lens has no figure. */
  cells: (Cell | null)[];
  rankedBy: number;
  top3: number;
}
export interface LensTab {
  id: string;
  short: string;
  name: string;
}

const LEVEL = ['Off', 'Low', 'Medium', 'High'];
/** Below this many lenses a score is topped up with neutral 50s, so one or two lenses cannot put a problem first or last. */
export const MIN_LENSES = 3;

/**
 * The reader's own ranking. EarthOS sets no default weights: until one is set the list is A to Z.
 * A problem's score is the weighted average of its position in the lenses that rank it; a lens with
 * no figure for a problem is left out of that problem's average, not counted as zero. A problem seen
 * by fewer than MIN_LENSES of the weighted lenses is pulled toward the middle.
 */
/** Lens positions used by the priority formula: several "how big" lenses, one for neglect, one for solvability. */
export interface Formula {
  big: number[];
  neglected: number;
  solvable: number;
}
/** In the formula the bottom of a lens counts as 10, not 0, so one last place cannot wipe out the other two factors. */
const floor = (x: number) => 0.1 + 0.9 * x;
const pct = (x: number) => Math.round(x * 100);

export function WeightedList({ rows, lenses, presets, formula }: { rows: Row[]; lenses: LensTab[]; presets: { label: string; weights: number[] }[]; formula: Formula }) {
  const [w, setW] = useState<number[]>(lenses.map(() => 0));
  const [useFormula, setUseFormula] = useState(false);
  const active = useFormula || w.some((x) => x > 0);

  const weighted = w.filter((x) => x > 0).length;
  const match = presets.findIndex((p) => p.weights.every((x, i) => x === w[i]));
  const choice = useFormula ? 'formula' : !active ? 'none' : match >= 0 ? String(match) : 'custom';
  const avgWeight = weighted ? w.reduce((x, y) => x + y, 0) / weighted : 0;
  const scored = rows.map((r) => {
    let sum = 0;
    let total = 0;
    let used = 0;
    r.cells.forEach((c, i) => {
      if (c && w[i] > 0) {
        sum += w[i] * c.score;
        total += w[i];
        used++;
      }
    });
    // Thin evidence is pulled toward the middle: a problem seen by fewer than MIN_LENSES of the weighted
    // lenses is topped up to that number with neutral scores of 50, each carrying the reader's average weight.
    const pad = used ? Math.max(0, Math.min(MIN_LENSES, weighted) - used) : 0;
    return { r, score: used ? (sum + pad * avgWeight * 0.5) / (total + pad * avgWeight) : null, used, pad, parts: null as null | { big: number; neg: number | null; solv: number | null } };
  });
  // Priority formula: how big × how neglected × how solvable. A factor with no figure is set to the neutral 50.
  const byFormula = rows.map((r) => {
    const bigs = formula.big.map((i) => r.cells[i]).filter((c): c is Cell => !!c);
    const big = bigs.length ? floor(bigs.reduce((x, c) => x + c.score, 0) / bigs.length) : null;
    const n = r.cells[formula.neglected];
    const v = r.cells[formula.solvable];
    const neg = n ? floor(n.score) : null;
    // The solvability source lists only fixes it rates as high-return, so a figure there can raise the factor above the neutral 50 but never lower it.
    const solv = v ? 0.5 + 0.5 * v.score : null;
    return { r, raw: big === null ? null : big * (neg ?? 0.5) * (solv ?? 0.5), used: bigs.length, pad: 0, parts: big === null ? null : { big, neg, solv } };
  });
  const top = Math.max(...byFormula.map((x) => x.raw ?? 0), 0.0001);
  const formulaScored = byFormula.map(({ raw, ...rest }) => ({ ...rest, score: raw === null ? null : raw / top }));
  const list = useFormula
    ? [...formulaScored].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.r.name.localeCompare(b.r.name))
    : active
    ? [...scored].sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.r.name.localeCompare(b.r.name))
    : [...scored].sort((a, b) => a.r.name.localeCompare(b.r.name));
  let place = 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="panel p-4">
        <label className="flex flex-wrap items-center gap-2">
          <span className="tag text-[10px] text-subtle">Start from</span>
          <select
            value={choice}
            onChange={(e) => {
              const v = e.target.value;
              setUseFormula(v === 'formula');
              if (v === 'none' || v === 'formula') setW(lenses.map(() => 0));
              else if (v !== 'custom') setW(presets[Number(v)].weights);
            }}
            className="rounded border border-line-strong bg-transparent px-2 py-1.5 text-sm text-ink-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
          >
            <option value="none">No weights (A to Z)</option>
            {presets.map((p, k) => (
              <option key={p.label} value={k}>
                {p.label}
              </option>
            ))}
            <option value="formula">Priority formula: big × neglected × solvable</option>
            {choice === 'custom' && <option value="custom">Your own mix</option>}
          </select>
        </label>
        {useFormula && (
          <p className="mt-3 max-w-3xl text-xs text-muted">
            One rule, shown in full: priority = how big × how neglected × how solvable. Big is the average position in {formula.big.map((i) => lenses[i].name).join(', ')}. Neglected is the position in {lenses[formula.neglected].name}. Solvable is the position in {lenses[formula.solvable].name}. A factor with no figure is set to a neutral 50, and the top result is scaled to 100.
          </p>
        )}
        <div className={`mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3 ${useFormula ? 'hidden' : ''}`}>
          {lenses.map((l, i) => (
            <label key={l.id} className="flex flex-col gap-1 text-xs text-muted">
              <span className="flex justify-between gap-2">
                <span className="text-ink-2">{l.name}</span>
                <span className={w[i] ? 'text-accent' : 'text-subtle'}>{LEVEL[w[i]]}</span>
              </span>
              <input
                type="range"
                min={0}
                max={3}
                step={1}
                value={w[i]}
                onChange={(e) => setW(w.map((x, j) => (j === i ? Number(e.target.value) : x)))}
                aria-valuetext={LEVEL[w[i]]}
                className="w-full accent-[var(--color-accent)]"
              />
            </label>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {useFormula
          ? 'Ordered by the formula above. It is one transparent rule, not a verdict: change the rule and the order changes.'
          : active
          ? `Ordered by your weights across ${weighted} ${weighted === 1 ? 'lens' : 'lenses'}. This order is yours, not EarthOS's.`
          : 'No weights set, so the list is A to Z. Pick a starting point or move a slider.'}
      </p>

      <ol className="flex flex-col gap-2" aria-label={useFormula ? 'Problems, ordered by the priority formula' : active ? 'Problems, ordered by your weights' : 'Problems, A to Z'}>
        {list.map(({ r, score, used, pad, parts }) => {
          const has = active && score !== null;
          if (has) place++;
          return (
            <li key={r.id} className="card p-4">
              <div className="flex items-baseline gap-3">
                <span className="w-6 shrink-0 font-mono text-lg font-bold text-ink-2">{has ? place : '–'}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <h3 className="text-base font-semibold text-ink">
                      {r.href ? (
                        <Link href={r.href} className="hover:underline">
                          {r.name}
                        </Link>
                      ) : (
                        r.name
                      )}
                    </h3>
                    <span className="tag text-[10px] text-subtle">
                      {r.rankedBy ? `Top 3 in ${r.top3} of ${r.rankedBy} ${r.rankedBy === 1 ? 'lens' : 'lenses'}` : 'Too few lenses to compare'}
                    </span>
                  </div>
                  {active && (
                    <div className="mt-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-line" role="img" aria-label={has ? `Score ${Math.round((score ?? 0) * 100)} out of 100` : 'No figure under these weights'}>
                        {has && <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max((score ?? 0) * 100, 2)}%` }} />}
                      </div>
                      <p className="tag mt-1 text-[10px] text-subtle">
                        {has && parts
                          ? `Score ${pct(score ?? 0)} of 100: big ${pct(parts.big)} × neglected ${parts.neg === null ? '50 (no figure)' : pct(parts.neg)} × solvable ${parts.solv === null ? '50 (no figure)' : pct(parts.solv)}`
                          : has
                          ? `Score ${Math.round((score ?? 0) * 100)} of 100, from ${used} of your ${weighted} weighted ${weighted === 1 ? 'lens' : 'lenses'}${pad ? `, pulled toward 50 because that is few` : ''}`
                          : 'None of the lenses you weighted has a figure for this'}
                      </p>
                    </div>
                  )}
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Position in each lens">
                    {r.cells.map((c, i) => (
                      <li
                        key={lenses[i].id}
                        className={`tag rounded border px-1.5 py-0.5 text-[10px] ${c ? (w[i] || (useFormula && (formula.big.includes(i) || i === formula.neglected || i === formula.solvable)) ? 'border-accent-line text-ink-2' : 'border-line text-muted') : 'border-line text-subtle opacity-60'}`}
                        title={c ? `${lenses[i].name}: ${c.rank}${c.tied ? ' equal' : ''} of ${c.of}` : `${lenses[i].name}: no figure`}
                      >
                        {lenses[i].short} {c ? `${c.rank}${c.tied ? '=' : ''}/${c.of}` : '–'}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
