import type { Metadata } from 'next';
import { CAT_SCALE, getGameplans, getMasterPlan, getPolicyRatings, type CatRating, type PolicyRating } from '@/lib/policies';
import { RATING, slug } from '@/components/policies/rating';
import { getStepDetails } from '@/lib/steps';
import { MasterPlan, rankMaster } from '@/components/policies/MasterPlan';
import { ImpactPanel } from '@/components/policies/ImpactPanel';
import { getImpact } from '@/lib/impact';
import { TopicPage } from '@/components/policies/TopicPage';
import { RankList, type RankRow } from '@/components/policies/RankList';
import { StepCards } from '@/components/policies/StepCards';
import { formatShare } from '@/lib/emissions';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Policies — EarthOS' };

const rank = (r: CatRating) => CAT_SCALE.indexOf(r);
const worstFirst = (a: PolicyRating, b: PolicyRating) => rank(b.rating) - rank(a.rating) || a.country.localeCompare(b.country);

export default async function PoliciesPage() {
  const [ratings, plans, master, impact, details] = await Promise.all([getPolicyRatings(), getGameplans(), getMasterPlan(), getImpact('climate'), getStepDetails()]);
  const major = ratings.filter((r) => r.group === 'major').sort(worstFirst);
  const closest = ratings.filter((r) => r.group === 'closest').sort(worstFirst);
  const counts = CAT_SCALE.map((r) => ({ r, n: major.filter((x) => x.rating === r).length }));
  const onTrack = major.filter((x) => rank(x.rating) <= rank('Almost sufficient')).length;
  const maxShare = Math.max(1, ...ratings.map((r) => r.emissions?.share ?? 0));
  const majorShare = major.reduce((t, x) => t + (x.emissions?.share ?? 0), 0);
  const emissionsSrc = ratings.find((r) => r.emissions)?.emissions;
  const ranked = rankMaster(master, plans, [...major, ...closest]);

  const row = (p: PolicyRating): RankRow => ({
    key: p.iso3,
    name: p.country,
    href: `/policies/${slug(p.iso3)}`,
    steps: plans.get(p.iso3)?.length ?? 0,
    note: p.note || undefined,
    badge: { text: p.rating, cls: RATING[p.rating].cls },
    metrics: p.emissions
      ? [{
          label: 'Share of world emissions',
          value: formatShare(p.emissions.share),
          pct: (p.emissions.share / maxShare) * 100,
          tone: 'muted',
          title: `${Math.round(p.emissions.mt).toLocaleString('en-US')} Mt CO2e in ${p.emissions.year}`,
        }]
      : [],
  });

  return (
    <TopicPage
      topic="climate"
      title="Climate: who is on track, and what would close the gap"
      summary={
        <>
          {onTrack === 0
            ? `None of the ${major.length} largest emitters is rated on track to keep warming below 2 °C.`
            : `${onTrack} of the ${major.length} largest emitters are rated on track to keep warming below 2 °C.`}
          {majorShare > 0 && <> Together they produce {formatShare(majorShare)} of the world&apos;s greenhouse gas emissions.</>}
        </>
      }
      aboutLabel="About these ratings"
      about={
        <>
          Ratings come from the Climate Action Tracker, an independent scientific project run by Climate Analytics and
          NewClimate Institute. It rates each government&apos;s targets, policies and climate finance against the Paris
          Agreement. EarthOS shows these ratings as published and does not rate countries itself.
        </>
      }
    >
      <RankList
        title="Largest emitters, worst rated first"
        legend={<>Bar: share of world emissions. Label: how well the country&apos;s plan matches the Paris Agreement. These are separate things. Click a country for its gameplan.</>}
        rows={major.map(row)}
        footer={
          <details className="group">
            <summary className="cursor-pointer list-none font-semibold text-accent hover:underline [&::-webkit-details-marker]:hidden">
              What the ratings mean
            </summary>
            <p className="mb-2 mt-2">The warming the world would see if every country did the same. Count among the largest emitters in bold.</p>
            <div className="flex flex-wrap gap-2">
              {[...CAT_SCALE].reverse().map((r) => {
                const n = counts.find((c) => c.r === r)!.n;
                return (
                  <span key={r} className={`tag rounded border px-2 py-1 ${RATING[r].cls}`}>
                    {r} · {RATING[r].world.replace(' if all did the same', '')}
                    {n > 0 && <b className="ml-1.5">×{n}</b>}
                  </span>
                );
              })}
            </div>
          </details>
        }
      />

      {closest.length > 0 && (
        <RankList
          title="Closest to on track"
          legend={<>No country the tracker assesses is rated fully 1.5 °C compatible. These are rated Almost sufficient; all are small emitters.</>}
          rows={closest.map(row)}
        />
      )}

      <StepCards
        title={`Gameplan: ${ranked.length} steps`}
        intro="Ranked by how much of world emissions comes from the countries that still need to take each step."
        steps={ranked.map((m) => ({
          theme: m.theme,
          title: m.title,
          why: m.why,
          href: details.has(m.theme) ? `/policies/steps/${m.theme}` : undefined,
          meta: `${m.who.length} ${m.who.length === 1 ? 'country' : 'countries'} · ${formatShare(m.share)} of world emissions`,
        }))}
      />

      <MasterPlan master={master} plans={plans} countries={[...major, ...closest]} detailThemes={[...details.keys()]} />

      <ImpactPanel impact={impact} />

      <section className="panel p-5">
        <h2 className="eyebrow mb-2">Sources and notes</h2>
        <p className="max-w-3xl text-xs text-muted">
          Ratings: Climate Action Tracker; each country page shows when it last assessed that country. A country&apos;s share of emissions
          shows how much it matters to the total; its rating shows how well its plan matches the Paris Agreement.
          {emissionsSrc && (
            <>
              {' '}Emissions shares are for {emissionsSrc.year}, excluding land use, from{' '}
              <a href={emissionsSrc.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                EDGAR
              </a>{' '}
              (EU Joint Research Centre). Bars are scaled to the largest emitter.
            </>
          )}
        </p>
      </section>
    </TopicPage>
  );
}
