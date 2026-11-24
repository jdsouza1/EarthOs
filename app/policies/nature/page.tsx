import type { Metadata } from 'next';
import { getGameplans, getMasterPlan } from '@/lib/policies';
import { getStepDetails } from '@/lib/steps';
import { getNature } from '@/lib/nature';
import { getImpact } from '@/lib/impact';
import { ImpactPanel } from '@/components/policies/ImpactPanel';
import { TopicPage } from '@/components/policies/TopicPage';
import { RankList, type RankRow } from '@/components/policies/RankList';
import { StepCards } from '@/components/policies/StepCards';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Nature & biodiversity — Policies — EarthOS' };

const EPI = 'https://epi.yale.edu/2026/results/indicator/BDH';
const MEGA = 'https://www.weforum.org/stories/2024/06/environment-day-biodiversity-world-megadiverse-countries/';

const change = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export default async function NaturePage() {
  const [countries, impact, master, plans, details] = await Promise.all([getNature(), getImpact('nature'), getMasterPlan('nature'), getGameplans('nature'), getStepDetails('nature')]);

  return (
    <TopicPage
      topic="nature"
      title="Nature and biodiversity: how well the most species-rich countries protect it"
      summary={<>The 17 megadiverse countries hold about 70% of the world&apos;s species, according to Conservation International. {countries.length} are scored here, lowest first.</>}
      aboutLabel="About these scores"
      about={
        <>
            Scores come from the Yale/Columbia Environmental Performance Index 2026, Biodiversity &amp; Habitat category. It combines 12 indicators on protected areas, habitat left, species at risk and ecosystem resilience.
            The countries shown are the megadiverse countries recognised by Conservation International and the UN Environment Programme&apos;s monitoring centre. EarthOS shows the scores as published and does not rate countries itself.
        </>
      }
    >
      <RankList
        title="Megadiverse countries, lowest score first"
        legend={<>Bar: Biodiversity &amp; Habitat score out of 100, Environmental Performance Index 2026. Higher is better. Click a country for its gameplan.</>}
        rows={countries.map((c): RankRow => ({
          key: c.iso3,
          name: c.country,
          href: (plans.get(c.iso3)?.length ?? 0) > 0 ? `/policies/nature/${c.iso3.toLowerCase()}` : undefined,
          steps: plans.get(c.iso3)?.length ?? 0,
          note: c.note || undefined,
          metrics: [{ label: 'Biodiversity & Habitat score', value: <>{c.epiScore} <span className="text-subtle">{change(c.epiChange)} in 10 yrs</span></>, pct: c.epiScore, title: `Environmental Performance Index 2026: ${c.epiScore}, ${change(c.epiChange)} in 10 years, rank ${c.epiRank} of 177` }],
        }))}
      />

      <StepCards
        title={`Gameplan: ${master.length} steps`}
        intro="The steps the sources say would protect more nature, from the Global Biodiversity Framework and other named sources. EarthOS does not rank them."
        steps={master.map((m) => ({
          theme: m.theme,
          title: m.title,
          why: m.why,
          href: details.has(m.theme) ? `/policies/nature/steps/${m.theme}` : undefined,
          meta: `${countries.filter((c) => plans.get(c.iso3)?.some((p) => p.theme === m.theme)).length} of ${countries.length} countries`,
        }))}
      />

      <ImpactPanel impact={impact} />

      <section className="panel p-5">
        <h2 className="eyebrow mb-2">Sources and notes</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-4 text-xs text-muted">
          <li>
            Scores, change and rank:{' '}
            <a href={EPI} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Yale/Columbia Environmental Performance Index 2026, Biodiversity &amp; Habitat
            </a>
            . The rank is among 177 countries. Higher scores are better.
          </li>
          <li>
            Country list:{' '}
            <a href={MEGA} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              the 17 megadiverse countries
            </a>{' '}
            as listed by the World Economic Forum.
          </li>
        </ul>
        <p className="mt-3 max-w-3xl text-xs text-muted">
          Venezuela is on the megadiverse list but is not scored by the index, so it is not shown. A score reflects what a country has kept and protected, which depends partly on its size, wealth and history. It is not a measure of effort.
        </p>
        <p className="mt-2 max-w-3xl text-xs text-muted">
          Each country&apos;s gameplan starts with the three land-based areas where it scores lowest in the index, then adds subsidy reform. Steps come from the Global Biodiversity Framework and the sources named on each step page.
        </p>
      </section>
    </TopicPage>
  );
}
