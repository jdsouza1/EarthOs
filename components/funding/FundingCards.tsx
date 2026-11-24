'use client';

import { useState } from 'react';
import type { Block, FigureKind, FundingArea } from '@/lib/funding';

const BLOCK_LABEL: Record<Block, string> = { capital: 'Capital', policy: 'Policy and governance', tech: 'Tech and R&D' };
const KIND_LABEL: Record<FigureKind, string> = { measured: 'Measured', modelled: 'Modelled', expert: 'Expert', pledged: 'Pledged', target: "Funder's target" };

function money(b: number): string {
  if (b >= 1000) return `$${(b / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} trillion`;
  if (b >= 1) return `$${b.toLocaleString('en-US', { maximumFractionDigits: 1 })} billion`;
  return `$${Math.round(b * 1000).toLocaleString('en-US')} million`;
}
function moneyRange(low: number, high: number): string {
  if (low === high) return money(low);
  const [a, b] = [money(low), money(high)];
  return a.split(' ')[1] === b.split(' ')[1] ? `${a.split(' ')[0]} to ${b}` : `${a} to ${b}`;
}

function Kind({ k }: { k: FigureKind }) {
  return <span className="tag rounded border border-line px-1.5 py-0.5 text-[10px] text-subtle">{KIND_LABEL[k]}</span>;
}

function Links({ list }: { list: { name: string; url: string }[] }) {
  return (
    <>
      {list.map((s) => (
        <a key={s.url + s.name} href={s.url} target="_blank" rel="noreferrer" className="text-accent hover:underline" title={s.name}>
          {s.name}
        </a>
      )).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, '; ', el] : [el]), [])}
    </>
  );
}

/** Spent against needed, on this card's own scale. Cards are never drawn on a shared scale. */
function Bar({ a }: { a: FundingArea }) {
  if (!a.spent || !a.need || a.need.isExtra) return null;
  const max = Math.max(a.need.high, a.spent.high);
  const pct = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <div className="mt-3" role="img" aria-label={`Spent ${money(a.spent.high)} of ${moneyRange(a.need.low, a.need.high)} needed`}>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: pct(a.spent.high) }} />
      </div>
      <div className="tag mt-1 flex justify-between text-[10px] text-subtle">
        <span>{a.period === 'five_years' ? 'Secured' : 'Spent'}: {money(a.spent.high)}</span>
        <span>Needed: {moneyRange(a.need.low, a.need.high)}</span>
      </div>
    </div>
  );
}

function Card({ a }: { a: FundingArea }) {
  const per = a.period === 'five_years' ? 'over 2026 to 2030' : 'a year';
  return (
    <article className="card flex flex-col p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="tag text-[10px] text-subtle">{a.tierLabel}</p>
          <h2 className="mt-1 text-base font-bold text-ink-2">{a.title}</h2>
        </div>
        <div className="flex flex-wrap gap-1">
          {a.blocks.map((b) => (
            <span key={b} className="tag rounded border border-accent-line bg-accent-bg px-2 py-0.5 text-[10px] text-accent">
              {BLOCK_LABEL[b]}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="tag text-[10px] text-subtle">Gap</p>
        <p className="font-mono text-2xl font-bold text-ink-2">
          {a.gap ? moneyRange(a.gap.low, a.gap.high) : 'None published'}
          {a.gap && <span className="ml-1.5 text-xs font-normal text-muted">{a.need?.isExtra ? `extra ${per}` : per}</span>}
        </p>
      </div>

      <Bar a={a} />

      <dl className="mt-3 grid gap-2 text-sm">
        {a.spent && (
          <div>
            <dt className="tag flex items-center gap-2 text-[10px] text-subtle">
              {a.period === 'five_years' ? 'Secured' : 'Spent now'} <Kind k={a.spent.kind} />
            </dt>
            <dd className="mt-0.5 text-body">
              {a.spent.text}. <span className="text-xs"><Links list={a.spent.sources} /></span>
            </dd>
          </div>
        )}
        <div>
          <dt className="tag flex items-center gap-2 text-[10px] text-subtle">Needed {a.need && <Kind k={a.need.kind} />}</dt>
          <dd className="mt-0.5 text-body">
            {a.needText}.{a.need && <> <span className="text-xs"><Links list={a.need.sources} /></span></>}
          </dd>
        </div>
        {a.outcome && (
          <div>
            <dt className="tag flex items-center gap-2 text-[10px] text-subtle">What the source says the money does <Kind k="expert" /></dt>
            <dd className="mt-0.5 text-body">
              {a.outcome.text} <span className="text-xs"><Links list={[a.outcome.source]} /></span>
            </dd>
          </div>
        )}
      </dl>

      <p className="mt-3 text-xs text-muted">
        <span className="text-subtle">What else stands in the way: </span>
        {a.blocksWhy}
      </p>
      <p className="mt-1 text-xs text-muted">
        <span className="text-subtle">What this covers: </span>
        {a.covers}
      </p>
      {a.note && <p className="mt-1 text-xs text-subtle">{a.note}</p>}

      <div className="tag mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-3 text-[10px]">
        <a href={`/data?card=${a.indicatorId}#embed`} className="text-accent hover:underline">Live indicator</a>
        <a href="/levers" className="text-accent hover:underline">Who can act</a>
      </div>
    </article>
  );
}

const FILTERS: ('all' | Block)[] = ['all', 'capital', 'policy', 'tech'];

export function FundingCards({ areas }: { areas: FundingArea[] }) {
  const [f, setF] = useState<'all' | Block>('all');
  const shown = f === 'all' ? areas : areas.filter((a) => a.blocks.includes(f));
  return (
    <section aria-label="Funding by area">
      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs" role="group" aria-label="Filter by what stands in the way">
        <span className="text-subtle">What stands in the way:</span>
        {FILTERS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={f === k}
            onClick={() => setF(k)}
            className={`rounded-full border px-3 py-1 ${f === k ? 'border-accent bg-accent-bg text-accent' : 'border-line text-muted hover:text-ink'}`}
          >
            {k === 'all' ? 'All' : BLOCK_LABEL[k]}
          </button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {shown.map((a) => (
          <Card key={a.id} a={a} />
        ))}
      </div>
    </section>
  );
}
