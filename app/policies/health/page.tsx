import type { Metadata } from 'next';
import { getGameplans, getMasterPlan } from '@/lib/policies';
import { getStepDetails } from '@/lib/steps';
import { getHealth } from '@/lib/health';
import { getImpact } from '@/lib/impact';
import { ImpactPanel } from '@/components/policies/ImpactPanel';
import { TopicPage } from '@/components/policies/TopicPage';
import { RankList, type RankRow } from '@/components/policies/RankList';
import { StepCards } from '@/components/policies/StepCards';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Health & vaccination — Policies — EarthOS' };

const WUENIC = 'https://www.unicef.org/press-releases/global-childhood-immunization-coverage-inches-forward-despite-conflict-and-hesitancy';
const GHO = 'https://ghoapi.azureedge.net/api/WHS4_100';
const PORTAL = 'https://immunizationdata.who.int/global/wiise-detail-page/diphtheria-tetanus-toxoid-and-pertussis-(dtp)-vaccination-coverage';
const IA2030 = 'https://www.who.int/data/gho/indicator-metadata-registry/imr-details/7791';

export default async function HealthPage() {
  const [countries, impact, master, plans, details] = await Promise.all([getHealth(), getImpact('health'), getMasterPlan('health'), getGameplans('health'), getStepDetails('health')]);

  return (
    <TopicPage
      topic="health"
      title="Health and vaccination: where the fewest children are reached, and what would change that"
      summary={<>These are the {countries.length} countries with the lowest third-dose DTP coverage in 2025. The Immunization Agenda 2030 target is 90%.</>}
      aboutLabel="About these figures"
      about={
        <>
            Coverage figures are the WHO/UNICEF Estimates of National Immunization Coverage (WUENIC) for 2025, released on 15 July 2026. WHO and UNICEF produce them each year from what countries report, checked against surveys.
            The countries shown are the 15 with the lowest third-dose DTP coverage, the measure WHO and UNICEF use as the marker of how well a country delivers routine immunization. EarthOS shows the figures as published and does not rate countries itself.
        </>
      }
    >
      <RankList
        title="Lowest coverage first"
        legend={<>Bar: share of infants who got all three DTP doses in 2025. The line marks the 90% target. Click a country for its gameplan.</>}
        rows={countries.map((c): RankRow => ({
          key: c.iso3,
          name: c.country,
          href: (plans.get(c.iso3)?.length ?? 0) > 0 ? `/policies/health/${c.iso3.toLowerCase()}` : undefined,
          steps: plans.get(c.iso3)?.length ?? 0,
          note: c.note || undefined,
          metrics: [{ label: 'Third DTP dose, 2025', value: <>{c.dtp3}% <span className="text-subtle">of 90%</span></>, pct: c.dtp3, marker: 90, title: `Third-dose DTP ${c.dtp3}% · first dose ${c.dtp1}% · measles ${c.mcv1}% / ${c.mcv2}%` }],
        }))}
      />

      <StepCards
        title={`Gameplan: ${master.length} steps`}
        intro="The steps the sources say would reach more children. EarthOS does not rank them."
        steps={master.map((m) => ({
          theme: m.theme,
          title: m.title,
          why: m.why,
          href: details.has(m.theme) ? `/policies/health/steps/${m.theme}` : undefined,
          meta: `${countries.filter((c) => plans.get(c.iso3)?.some((p) => p.theme === m.theme)).length} of ${countries.length} countries`,
        }))}
      />

      <ImpactPanel impact={impact} />

      <section className="panel p-5">
        <h2 className="eyebrow mb-2">Sources and notes</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-4 text-xs text-muted">
          <li>
            Coverage figures: WHO/UNICEF Estimates of National Immunization Coverage, 2025 revision, from the{' '}
            <a href={GHO} target="_blank" rel="noreferrer" className="text-accent hover:underline">WHO Global Health Observatory data service</a> and the{' '}
            <a href={PORTAL} target="_blank" rel="noreferrer" className="text-accent hover:underline">WHO Immunization Data portal</a>. Release:{' '}
            <a href={WUENIC} target="_blank" rel="noreferrer" className="text-accent hover:underline">UNICEF and WHO, 15 July 2026</a>.
          </li>
          <li>
            The 90% target:{' '}
            <a href={IA2030} target="_blank" rel="noreferrer" className="text-accent hover:underline">Immunization Agenda 2030 coverage indicator</a>.
          </li>
        </ul>
        <p className="mt-3 max-w-3xl text-xs text-muted">
          Coverage reflects conflict, displacement, health budgets and trust in vaccines at the time of the data, and is not a measure of a government&apos;s effort. For 12 of the 15 countries, the WHO/UNICEF estimate is well below what the government reports; each country page gives the reported figure and the reason WHO and UNICEF give.
        </p>
        <p className="mt-2 max-w-3xl text-xs text-muted">
          Each country&apos;s gameplan lists its four coverage measures, lowest coverage first, then adds funding and data. Steps come from the sources named on each step page.
        </p>
      </section>
    </TopicPage>
  );
}
