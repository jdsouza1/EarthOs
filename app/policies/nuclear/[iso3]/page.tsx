import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getGameplans, getMasterPlan } from '@/lib/policies';
import { getStepDetails } from '@/lib/steps';
import { getNuclear } from '@/lib/nuclear';

export const dynamicParams = false;

const NTI = 'https://www.ntiindex.org/country/';
const NTI_SLUG: Record<string, string> = { USA: 'united-states', RUS: 'russian-federation', CHN: 'china', FRA: 'france', GBR: 'united-kingdom', IND: 'india', PAK: 'pakistan', ISR: 'israel', PRK: 'north-korea' };
const fmt = (n: number) => n.toLocaleString('en-US');

export async function generateStaticParams() {
  return (await getNuclear()).map((c) => ({ iso3: c.iso3.toLowerCase() }));
}

async function load(iso3: string) {
  const [countries, plans, master, details] = await Promise.all([getNuclear(), getGameplans('nuclear'), getMasterPlan('nuclear'), getStepDetails('nuclear')]);
  const c = countries.find((x) => x.iso3.toLowerCase() === iso3);
  if (!c) return null;
  return { c, steps: plans.get(c.iso3) ?? [], titles: new Map(master.map((m) => [m.theme, m.title])), detailThemes: new Set(details.keys()) };
}

export async function generateMetadata({ params }: { params: Promise<{ iso3: string }> }): Promise<Metadata> {
  const d = await load((await params).iso3);
  return { title: d ? `${d.c.country} nuclear gameplan — EarthOS` : 'Policies — EarthOS' };
}

export default async function NuclearCountryPage({ params }: { params: Promise<{ iso3: string }> }) {
  const d = await load((await params).iso3);
  if (!d) notFound();
  const { c, steps, titles, detailThemes } = d;
  const src = NTI + (NTI_SLUG[c.iso3] ?? '') + '/';

  return (
    <>
      <Link href="/policies/nuclear" className="tag flex items-center gap-1 self-start text-accent hover:underline">
        <ArrowLeft size={12} /> All nuclear-armed countries
      </Link>

      <section className="panel p-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-bold text-ink">{c.country}</h1>
          <span className="font-mono text-xs text-subtle">{c.iso3}</span>
        </div>
        <p className="text-sm text-body">
          Nuclear security score <b className="text-ink">{c.ntiScore}</b> out of 100 ({c.ntiChange > 0 ? '+' : c.ntiChange < 0 ? '−' : ''}
          {Math.abs(c.ntiChange)} since 2023), rank {c.ntiRank} of 22. Military stockpile about <b className="text-ink">{fmt(c.stockpile)}</b> warheads (SIPRI, January 2026).
        </p>
        {c.note && <p className="mt-2 text-sm text-body">{c.note}</p>}
        <p className="tag mt-3 text-[10px] text-subtle">
          Scored by the{' '}
          <a href={src} target="_blank" rel="noreferrer" className="text-accent hover:underline">NTI Nuclear Security Index 2026</a>
        </p>
      </section>

      <section className="panel p-5">
        <h2 className="mb-1 text-sm font-bold text-body">Gameplan</h2>
        <p className="mb-4 max-w-3xl text-xs text-muted">
          Security steps are what the NTI Index lists as still to do for this country. Steps on arms control and risk reduction come from the sources on each step page.
          Summarised in EarthOS&apos;s own words; read the full assessment at the source.
        </p>
        {steps.length === 0 ? (
          <p className="text-sm text-muted">Not researched yet.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {steps.map((s) => (
              <li key={s.step} className="card flex gap-3 p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-xs font-bold text-subtle">{s.step}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-ink-2">{s.action}</span>
                    {detailThemes.has(s.theme) ? (
                      <Link href={`/policies/nuclear/steps/${s.theme}`} className="tag rounded border border-line-strong px-1.5 py-0.5 text-[9px] text-subtle hover:text-body" title="Master gameplan step">
                        {titles.get(s.theme)}
                      </Link>
                    ) : (
                      <span className="tag rounded border border-line-strong px-1.5 py-0.5 text-[9px] text-subtle">{titles.get(s.theme)}</span>
                    )}
                  </div>
                  {s.detail && <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <a href={src} target="_blank" rel="noreferrer" className="tag mt-4 inline-block text-[10px] text-accent hover:underline">
          Source: NTI Nuclear Security Index 2026 country profile
        </a>
      </section>
    </>
  );
}
