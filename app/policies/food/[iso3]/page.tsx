import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getGameplans, getMasterPlan } from '@/lib/policies';
import { getStepDetails } from '@/lib/steps';
import { getFood, severity, THRESHOLDS } from '@/lib/food';

export const dynamicParams = false;

const GHI = 'https://www.globalhungerindex.org/results/';
const PDF = 'https://www.welthungerhilfe.de/fileadmin/pictures/publications/de/studies-analysis/2026-welthunger-index-whi-englisch.pdf';

export async function generateStaticParams() {
  return (await getFood()).map((c) => ({ iso3: c.iso3.toLowerCase() }));
}

async function load(iso3: string) {
  const [countries, plans, master, details] = await Promise.all([getFood(), getGameplans('food'), getMasterPlan('food'), getStepDetails('food')]);
  const c = countries.find((x) => x.iso3.toLowerCase() === iso3);
  if (!c) return null;
  return { c, steps: plans.get(c.iso3) ?? [], titles: new Map(master.map((m) => [m.theme, m.title])), detailThemes: new Set(details.keys()) };
}

export async function generateMetadata({ params }: { params: Promise<{ iso3: string }> }): Promise<Metadata> {
  const d = await load((await params).iso3);
  return { title: d ? `${d.c.country} hunger gameplan — EarthOS` : 'Policies — EarthOS' };
}

export default async function FoodCountryPage({ params }: { params: Promise<{ iso3: string }> }) {
  const d = await load((await params).iso3);
  if (!d) notFound();
  const { c, steps, titles, detailThemes } = d;
  const rows: [string, number, number, string][] = [
    ['Undernourishment', c.undernourishment, THRESHOLDS.undernourishment, 'Share of the population that does not get enough food energy.'],
    ['Child stunting', c.stunting, THRESHOLDS.stunting, 'Share of children under five who are too short for their age.'],
    ['Child wasting', c.wasting, THRESHOLDS.wasting, 'Share of children under five who are too thin for their height.'],
    ['Child mortality', c.mortality, THRESHOLDS.mortality, 'Share of children who die before their fifth birthday.'],
  ];

  return (
    <>
      <Link href="/policies/food" className="tag flex items-center gap-1 self-start text-accent hover:underline">
        <ArrowLeft size={12} /> All countries
      </Link>

      <section className="panel p-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-bold text-ink">{c.country}</h1>
          <span className="font-mono text-xs text-subtle">{c.iso3}</span>
        </div>
        <p className="text-sm text-body">
          2026 Global Hunger Index score <b className="text-ink">{c.ghiScore.toFixed(1)}</b> out of 100 ({severity(c.ghiScore).toLowerCase()}; lower is better), rank {c.ghiRank} of 122.
        </p>
        {c.note && <p className="mt-2 text-sm text-body">{c.note}</p>}
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map(([name, v, max, hint]) => {
            const s = Math.min(100, (v / max) * 100);
            return (
              <li key={name}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="tag text-subtle">{name}</span>
                  <span className="font-mono text-xs text-ink-2">{v.toFixed(1)}%<span className="text-subtle"> · {s.toFixed(1)} of 100</span></span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line" title={hint + ' Higher is worse.'}>
                  <div className="h-full rounded-full bg-accent" style={{ width: `${s}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="tag mt-3 text-[10px] text-subtle">
          Scored by the{' '}
          <a href={GHI} target="_blank" rel="noreferrer" className="text-accent hover:underline">2026 Global Hunger Index</a>. Values are from{' '}
          <a href={PDF} target="_blank" rel="noreferrer" className="text-accent hover:underline">Appendix B</a>; each is shown as a share and on the index&apos;s own 0 to 100 scale.
        </p>
      </section>

      <section className="panel p-5">
        <h2 className="mb-1 text-sm font-bold text-body">Gameplan</h2>
        <p className="mb-4 max-w-3xl text-xs text-muted">
          The three of the four measures that sit furthest from zero on the index's own 0 to 100 scale come first (worst first), then hunger data and early warning, which applies to every country. This is a rule, not a judgement by EarthOS.
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
                    {detailThemes.has(s.theme) && (
                      <Link href={`/policies/food/steps/${s.theme}`} className="tag rounded border border-line-strong px-1.5 py-0.5 text-[9px] text-subtle hover:text-body" title="Master gameplan step">
                        {titles.get(s.theme)}
                      </Link>
                    )}
                  </div>
                  {s.detail && <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <a href={GHI} target="_blank" rel="noreferrer" className="tag mt-4 inline-block text-[10px] text-accent hover:underline">
          Source: 2026 Global Hunger Index
        </a>
      </section>
    </>
  );
}
