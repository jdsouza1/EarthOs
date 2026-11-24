import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getGameplans, getMasterPlan } from '@/lib/policies';
import { getStepDetails } from '@/lib/steps';
import { getHealth, MEASURES } from '@/lib/health';

export const dynamicParams = false;

const PORTAL = 'https://immunizationdata.who.int/global/wiise-detail-page/diphtheria-tetanus-toxoid-and-pertussis-(dtp)-vaccination-coverage';
const WUENIC = 'https://www.unicef.org/press-releases/global-childhood-immunization-coverage-inches-forward-despite-conflict-and-hesitancy';

export async function generateStaticParams() {
  return (await getHealth()).map((c) => ({ iso3: c.iso3.toLowerCase() }));
}

async function load(iso3: string) {
  const [countries, plans, master, details] = await Promise.all([getHealth(), getGameplans('health'), getMasterPlan('health'), getStepDetails('health')]);
  const c = countries.find((x) => x.iso3.toLowerCase() === iso3);
  if (!c) return null;
  return { c, steps: plans.get(c.iso3) ?? [], titles: new Map(master.map((m) => [m.theme, m.title])), detailThemes: new Set(details.keys()) };
}

export async function generateMetadata({ params }: { params: Promise<{ iso3: string }> }): Promise<Metadata> {
  const d = await load((await params).iso3);
  return { title: d ? `${d.c.country} vaccination gameplan — EarthOS` : 'Policies — EarthOS' };
}

export default async function HealthCountryPage({ params }: { params: Promise<{ iso3: string }> }) {
  const d = await load((await params).iso3);
  if (!d) notFound();
  const { c, steps, titles, detailThemes } = d;

  return (
    <>
      <Link href="/policies/health" className="tag flex items-center gap-1 self-start text-accent hover:underline">
        <ArrowLeft size={12} /> All countries
      </Link>

      <section className="panel p-5">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-bold text-ink">{c.country}</h1>
          <span className="font-mono text-xs text-subtle">{c.iso3}</span>
        </div>
        <p className="text-sm text-body">
          Third-dose DTP coverage in 2025: <b className="text-ink">{c.dtp3}%</b>, against the Immunization Agenda 2030 target of 90%.
        </p>
        {c.note && <p className="mt-2 text-sm text-body">{c.note}</p>}
        <ul className="mt-3 flex flex-col gap-2">
          {MEASURES.map((m) => {
            const v = c[m.key];
            return (
              <li key={m.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="tag text-subtle">{m.label}</span>
                  <span className="font-mono text-xs text-ink-2">{v}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line" title={m.hint}>
                  <div className="h-full rounded-full bg-accent" style={{ width: `${v}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
        <p className="tag mt-3 text-[10px] text-subtle">
          WHO/UNICEF Estimates of National Immunization Coverage, 2025 revision, from the{' '}
          <a href={PORTAL} target="_blank" rel="noreferrer" className="text-accent hover:underline">WHO Immunization Data portal</a>. Higher is better.
        </p>
      </section>

      <section className="panel p-5">
        <h2 className="mb-1 text-sm font-bold text-body">Gameplan</h2>
        <p className="mb-4 max-w-3xl text-xs text-muted">
          The four coverage measures, lowest coverage first, then funding and data, which applies to every country. This is a rule, not a judgement by EarthOS.
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
                    {detailThemes.has(s.theme) ? (
                      <Link href={`/policies/health/steps/${s.theme}`} className="text-sm font-bold text-ink-2 hover:text-accent hover:underline" title="Master gameplan step">
                        {titles.get(s.theme) ?? s.action}
                      </Link>
                    ) : (
                      <span className="text-sm font-bold text-ink-2">{s.action}</span>
                    )}
                  </div>
                  {s.detail && <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <a href={WUENIC} target="_blank" rel="noreferrer" className="tag mt-4 inline-block text-[10px] text-accent hover:underline">
          Source: WHO/UNICEF 2025 immunization coverage estimates
        </a>
      </section>
    </>
  );
}
