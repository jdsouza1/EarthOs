'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import type { WhatIf } from '@/lib/whatif';

const LIMIT = 1.5; // Paris Agreement limit, °C
const SCALE_MAX = 4; // °C at the right end of the bar

/** One what-if: pick a published scenario, see its outcome, why it differs, who can act and the source. */
export function WhatIfCard({ w }: { w: WhatIf }) {
  const [sel, setSel] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const titleId = useId();
  const s = w.states[sel];
  const single = w.states.length === 1;
  const celsius = s.unit === '°C' && s.valueNum !== null;

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = w.states.length;
    const next = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? (i + 1) % n : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? (i - 1 + n) % n : null;
    if (next === null) return;
    e.preventDefault();
    setSel(next);
    refs.current[next]?.focus();
  };

  const pct = celsius ? Math.min(100, Math.max(0, (s.valueNum! / SCALE_MAX) * 100)) : 0;
  const barColour = !celsius ? '' : s.valueNum! > 2 ? 'bg-critical' : s.valueNum! > LIMIT ? 'bg-warning' : 'bg-good';

  return (
    <section aria-labelledby={titleId} className="panel flex flex-col gap-4 p-5">
      <h2 id={titleId} className="text-xl leading-tight">{w.question}</h2>

      {single ? (
        <p className="text-sm text-muted">No published what-if found yet, so this shows where today&apos;s trend leads.</p>
      ) : (
        <div role="radiogroup" aria-label="Scenario" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {w.states.map((st, i) => {
            const on = i === sel;
            return (
              <button
                key={st.state}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => setSel(i)}
                onKeyDown={(e) => onKey(e, i)}
                className={`min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                  on ? 'border-accent bg-accent-bg font-semibold text-ink' : 'border-line-strong text-body hover:border-accent'
                }`}
              >
                {st.state}
                {st.isBaseline && <span className="ml-2 text-xs font-normal text-subtle">today&apos;s path</span>}
              </button>
            );
          })}
        </div>
      )}

      <div aria-live="polite" className="flex flex-col gap-1">
        <span className="text-sm text-muted">
          {w.metric}, {w.period}
        </span>
        <span className="font-mono text-3xl font-bold leading-tight text-ink">
          {s.value}
          {s.unit && <span className="ml-1.5 text-lg font-normal text-muted">{s.unit}</span>}
        </span>
        {celsius && (
          <div className="mt-2" aria-hidden="true">
            <div className="relative h-2.5 rounded-full bg-inset">
              <div className={`h-2.5 rounded-full ${barColour}`} style={{ width: `${pct}%` }} />
              <div className="absolute -top-1 h-4.5 w-0.5 bg-ink" style={{ left: `${(LIMIT / SCALE_MAX) * 100}%` }} />
            </div>
            <div className="mt-1 flex justify-between text-xs text-subtle">
              <span>0 °C</span>
              <span>line: 1.5 °C Paris limit</span>
              <span>{SCALE_MAX} °C</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-ink">{single ? 'What this assumes' : 'Why it changes'}</h3>
        <p className="text-sm text-body">{s.reason}</p>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-ink">Who can act</h3>
        <p className="text-sm text-body">
          {w.who}.{' '}
          <Link href={w.whoHref} className="text-accent hover:underline">
            See the levers and policies
          </Link>
        </p>
      </div>
      <p className="border-t border-line pt-3 text-xs text-subtle">
        Modelled ·{' '}
        <a href={w.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-2 hover:text-accent">
          {w.sourceName}
        </a>{' '}
        ({w.published}){w.note && <> · {w.note}</>}
      </p>
    </section>
  );
}
