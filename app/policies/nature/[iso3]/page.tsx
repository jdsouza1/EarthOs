import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getGameplans, getMasterPlan } from '@/lib/policies';
import { getStepDetails } from '@/lib/steps';
import { getNature } from '@/lib/nature';

export const dynamicParams = false;

const EPI = 'https://epi.yale.edu/2026/results/indicator/BDH';
const change = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export async function generateStaticParams() {
  return (await getNature()).map((c) => ({ iso3: c.iso3.toLowerCase() }));
}

async function load(iso3: string) {
  const [countries, plans, master, details] = await Promise.all([getNature(), getGameplans('nature'), getMasterPlan('nature'), getStepDetails('nature')]);
  const c = countries.find((x) => x.iso3.toLowerCase() === iso3);
  if (!c) return null;
  return { c, steps: plans.get(c.iso3) ?? [], titles: new Map(master.map((m) => [m.theme, m.title])), detailThemes: new Set(details.keys()) };
}

export async function generateMetadata({ params }: { params: Promise<{ iso3: string }> }): Promise<Metadata> {
  const d = await load((await params).iso3);
  return { title: d ? `${d.c.country} nature gameplan — EarthOS` : 'Policies — EarthOS' };
}

export default async function NatureCountryPage({ params }: { params: Promise<{ iso3: string }> }) {
  const d = await load((await params).iso3);
  if (!d) notFound();
  const { c, steps, titles, detailThemes } = d;
  const rows: [string, number, string, string][] = [
    ['Terrestrial biome protection', c.tbn, 'How much of each land habitat type is protected. 100 means 30% of every type.', 'https://epi.yale.edu/node/51173'],
    ['Species Habitat Index', c.shi, 'Suitable habitat still intact compared with 2001.', 'https://epi.yale.edu/node/51178'],
    ['Red List Index', c.rli, 'Average extinction risk of the country\'s species. Higher is lower risk.', 'https://epi.yale.edu/node/51179'],
    ['Biodiversity Habitat Index', c.bhi, 'Effect of habitat loss, degradation and fragmentation.', 'https://epi.yale.edu/node/51180'],
    ['Bioclimatic Ecosystem Resilience', c.beri, 'How well ecosystems can keep their species as the climate changes.', 'https://epi.yale.edu/node/51181'],
  ];

  return (
    <>
      <Link href="/policies/nature" className="tag flex items-center gap-1 self-start text-accent hover:underline">
        <ArrowLeft size={12} /> All megadiverse countries
      </Link>

      <section className="panel p-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-bold text-ink">{c.country}</h1>
          <span className="font-mono text-xs text-subtle">{c.iso3}</span>
        </div>
        <p className="text-sm text-body">
          Biodiversity &amp; Habitat score <b className="text-ink">{c.epiScore}</b> out of 100 ({change(c.epiChange)} over 10 years), rank {c.epiRank} of 177.
        </p>
        {c.note && <p className="mt-2 text-sm text-body">{c.note}</p>}
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map(([name, v, hint, url]) => (
            <li key={name}>
              <div className="flex items-baseline justify-between gap-2">
                <a href={url} target="_blank" rel="noreferrer" className="tag text-subtle hover:text-accent hover:underline">{name}</a>
                <span className="font-mono text-xs text-ink-2">{v}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line" title={hint}>
                <div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="tag mt-3 text-[10px] text-subtle">
          Scored by the{' '}
          <a href={EPI} target="_blank" rel="noreferrer" className="text-accent hover:underline">Yale/Columbia Environmental Performance Index 2026</a>
        </p>
      </section>

      <section className="panel p-5">
        <h2 className="mb-1 text-sm font-bold text-body">Gameplan</h2>
        <p className="mb-4 max-w-3xl text-xs text-muted">
          The three land-based areas where this country scores lowest in the index come first (weakest first), then subsidy reform, which applies to every country. This is a rule, not a judgement by EarthOS.
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
                      <Link href={`/policies/nature/steps/${s.theme}`} className="tag rounded border border-line-strong px-1.5 py-0.5 text-[9px] text-subtle hover:text-body" title="Master gameplan step">
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
        <a href={EPI} target="_blank" rel="noreferrer" className="tag mt-4 inline-block text-[10px] text-accent hover:underline">
          Source: Yale/Columbia Environmental Performance Index 2026
        </a>
      </section>
    </>
  );
}
