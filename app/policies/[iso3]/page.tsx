import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getGameplans, getMasterPlan, getPolicyRatings } from '@/lib/policies';
import { RATING, formatDate, slug } from '@/components/policies/rating';
import { formatShare } from '@/lib/emissions';

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getPolicyRatings()).map((p) => ({ iso3: slug(p.iso3) }));
}

async function load(iso3: string) {
  const [ratings, plans, master] = await Promise.all([getPolicyRatings(), getGameplans(), getMasterPlan()]);
  const p = ratings.find((r) => slug(r.iso3) === iso3);
  const titles = new Map(master.map((m) => [m.theme, m.title]));
  return p ? { p, steps: plans.get(p.iso3) ?? [], titles } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ iso3: string }> }): Promise<Metadata> {
  const data = await load((await params).iso3);
  return { title: data ? `${data.p.country} climate gameplan — EarthOS` : 'Policies — EarthOS' };
}

export default async function CountryPlanPage({ params }: { params: Promise<{ iso3: string }> }) {
  const data = await load((await params).iso3);
  if (!data) notFound();
  const { p, steps, titles } = data;
  const style = RATING[p.rating];

  return (
    <>
      <Link href="/policies" className="tag flex items-center gap-1 self-start text-accent hover:underline">
        <ArrowLeft size={12} /> All countries
      </Link>

      <section className="panel overflow-hidden">
        <div className={`h-1 w-full ${style.bar}`} />
        <div className="p-5">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-lg font-bold text-ink">{p.country}</h1>
            <span className="font-mono text-xs text-subtle">{p.iso3}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`tag rounded border px-2 py-1 ${style.cls}`}>{p.rating}</span>
            <span className="text-xs text-muted">{style.world}.</span>
          </div>
          {p.emissions && (
            <p className="mt-2 text-sm text-body">
              Produces <b className="text-ink">{formatShare(p.emissions.share)}</b> of the world&apos;s greenhouse gas
              emissions ({Math.round(p.emissions.mt).toLocaleString('en-US')} million tonnes CO2e in {p.emissions.year}).
            </p>
          )}
          {p.note && <p className="mt-2 text-sm text-body">{p.note}</p>}
          <p className="tag mt-3 text-[10px] text-subtle">
            Rated {formatDate(p.ratedOn)} by the{' '}
            <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              {p.tracker}
            </a>
            {p.emissions && (
              <>
                {' '}· Emissions:{' '}
                <a href={p.emissions.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                  EDGAR
                </a>
              </>
            )}
          </p>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="mb-1 text-sm font-bold text-body">Gameplan to get on track</h2>
        <p className="mb-4 max-w-3xl text-xs text-muted">
          {p.planNote ||
            `What the ${p.tracker} says ${p.country} would need to do to improve its rating.`}{' '}
          Summarised in EarthOS&apos;s own words; read the full assessment at the source.
        </p>
        {steps.length === 0 ? (
          <p className="text-sm text-muted">Not researched yet.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {steps.map((s) => (
              <li key={s.step} className="card flex gap-3 p-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-bold ${style.cls}`}>
                  {s.step}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-bold text-ink-2">{s.action}</span>
                    <Link href="/policies" className="tag rounded border border-line-strong px-1.5 py-0.5 text-[9px] text-subtle hover:text-body" title="Master gameplan step">
                      {titles.get(s.theme)}
                    </Link>
                  </div>
                  {s.detail && <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
        <a href={p.sourceUrl} target="_blank" rel="noreferrer" className="tag mt-4 inline-block text-[10px] text-accent hover:underline">
          Source: {p.tracker} country assessment
        </a>
      </section>
    </>
  );
}
