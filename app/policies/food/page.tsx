import type { Metadata } from 'next';
import { getGameplans, getMasterPlan } from '@/lib/policies';
import { getStepDetails } from '@/lib/steps';
import { getFood, severity } from '@/lib/food';
import { getImpact } from '@/lib/impact';
import { ImpactPanel } from '@/components/policies/ImpactPanel';
import { TopicPage } from '@/components/policies/TopicPage';
import { RankList, type RankRow } from '@/components/policies/RankList';
import { StepCards } from '@/components/policies/StepCards';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Food & hunger — Policies — EarthOS' };

const GHI = 'https://www.globalhungerindex.org/results/';
const PDF = 'https://www.welthungerhilfe.de/fileadmin/pictures/publications/de/studies-analysis/2026-welthunger-index-whi-englisch.pdf';

export default async function FoodPage() {
  const [countries, impact, master, plans, details] = await Promise.all([getFood(), getImpact('food'), getMasterPlan('food'), getGameplans('food'), getStepDetails('food')]);

  return (
    <TopicPage
      topic="food"
      title="Food and hunger: where hunger is worst, and what would reduce it"
      summary={<>These are the {countries.length} countries with the highest scores in the 2026 Global Hunger Index. A score of 35 to 49.9 counts as alarming.</>}
      aboutLabel="About these scores"
      about={
        <>
            Scores come from the 2026 Global Hunger Index, published by Welthungerhilfe, Concern Worldwide, Helvetas and the IFHV. It combines four measures: undernourishment and child mortality (one third each), and child stunting and child wasting (one sixth each). Lower is better.
            The countries shown are the 15 with the highest published scores. EarthOS shows the scores as published and does not rate countries itself.
        </>
      }
    >
      <RankList
        title="Highest hunger scores first"
        legend={<>Bar: Global Hunger Index 2026, from 0 (no hunger) to 100. Lower is better. Click a country for its gameplan.</>}
        rows={countries.map((c): RankRow => ({
          key: c.iso3,
          name: c.country,
          href: (plans.get(c.iso3)?.length ?? 0) > 0 ? `/policies/food/${c.iso3.toLowerCase()}` : undefined,
          steps: plans.get(c.iso3)?.length ?? 0,
          note: c.note || undefined,
          badge: { text: severity(c.ghiScore), cls: 'border-line-strong text-body' },
          metrics: [{ label: 'Global Hunger Index 2026', value: <>{c.ghiScore.toFixed(1)} <span className="text-subtle">#{c.ghiRank} of 122</span></>, pct: c.ghiScore, title: `Global Hunger Index 2026: ${c.ghiScore.toFixed(1)} (lower is better), rank ${c.ghiRank} of 122` }],
        }))}
      />

      <StepCards
        title={`Gameplan: ${master.length} steps`}
        intro="The steps the sources say would reduce hunger, grouped by the four measures the index uses plus the data that tracks them. EarthOS does not rank them."
        steps={master.map((m) => ({
          theme: m.theme,
          title: m.title,
          why: m.why,
          href: details.has(m.theme) ? `/policies/food/steps/${m.theme}` : undefined,
          meta: `${countries.filter((c) => plans.get(c.iso3)?.some((p) => p.theme === m.theme)).length} of ${countries.length} countries`,
        }))}
      />

      <ImpactPanel impact={impact} />

      <section className="panel p-5">
        <h2 className="eyebrow mb-2">Sources and notes</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-4 text-xs text-muted">
          <li>
            Scores and ranks:{' '}
            <a href={GHI} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              2026 Global Hunger Index
            </a>
            . The rank is among 122 countries. Lower scores are better.
          </li>
          <li>
            The four measures behind each score:{' '}
            <a href={PDF} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              the 2026 report, Appendix B
            </a>
            . Some values are index estimates or survey values, as noted on the country card.
          </li>
        </ul>
        <p className="mt-3 max-w-3xl text-xs text-muted">
          The index scores hunger from 0 (none) to 100; lower is better. Countries with only a provisional hunger category and no score are not shown. These include Burundi, South Sudan, Sudan and Yemen, each provisionally alarming. A score reflects hunger at the time of the data, which is affected by war, climate and aid, and is not a measure of a government&apos;s effort.
        </p>
        <p className="mt-2 max-w-3xl text-xs text-muted">
          Each country&apos;s gameplan starts with the three of its four measures that sit furthest from zero on the index&apos;s own 0 to 100 scale, then adds hunger data and early warning. Steps come from the sources named on each step page.</p>
      </section>
    </TopicPage>
  );
}
