import type { Metadata } from 'next';
import { getGameplans, getMasterPlan } from '@/lib/policies';
import { getStepDetails } from '@/lib/steps';
import { getAi, DIMENSIONS } from '@/lib/ai';
import { getImpact } from '@/lib/impact';
import { ImpactPanel } from '@/components/policies/ImpactPanel';
import { TopicPage } from '@/components/policies/TopicPage';
import { RankList, type RankRow } from '@/components/policies/RankList';
import { StepCards } from '@/components/policies/StepCards';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'AI governance — Policies — EarthOS' };

const GIRAI = 'https://www.global-index.ai/countries';
const GIRAI_FINDINGS = 'https://www.global-index.ai/takeaways';
const VIBRANCY = 'https://hai.stanford.edu/ai-index/global-vibrancy-tool';

export default async function AiPage() {
  const [countries, impact, master, plans, details] = await Promise.all([getAi(), getImpact('ai'), getMasterPlan('ai'), getGameplans('ai'), getStepDetails('ai')]);

  return (
    <TopicPage
      topic="ai"
      title="AI governance: how responsibly the leading AI countries govern it"
      summary={<>{countries.length} of the countries with the most AI activity, scored out of 100 by the Global Index on Responsible AI 2026, lowest first.</>}
      aboutLabel="About these figures"
      about={
        <>
            Scores are from the Global Index on Responsible AI (GIRAI) 2026, the second edition, published in July 2026 by the Global Center on AI Governance. It assesses 135 countries on 38 indicators in five dimensions, using evidence from November 2023 to
            September 2025. The countries shown are the top 15 in the latest Stanford HAI Global AI Vibrancy ranking (released November 2025, using data through 2024) that GIRAI assesses: Luxembourg (12th) is not in GIRAI, so Brazil (16th) is included. EarthOS shows the figures as
            published and does not rate countries itself.
        </>
      }
    >
      <RankList
        title="Leading AI countries, lowest score first"
        legend={<>Bar: responsible AI score out of 100 (GIRAI 2026). Higher is better. Click a country for its gameplan.</>}
        rows={countries.map((c): RankRow => {
          const low = [...DIMENSIONS].sort((a, b) => c[a.key] - c[b.key])[0];
          return {
            key: c.iso3,
            name: c.country,
            href: (plans.get(c.iso3)?.length ?? 0) > 0 ? `/policies/ai/${c.iso3.toLowerCase()}` : undefined,
            steps: plans.get(c.iso3)?.length ?? 0,
            note: c.note || `Lowest: ${low.label} ${c[low.key].toFixed(1)}`,
            metrics: [{ label: 'GIRAI 2026 score', value: <>{c.index.toFixed(1)} <span className="text-subtle">#{c.rank} of 135</span></>, pct: c.index, title: `GIRAI 2026: ${c.index.toFixed(1)} of 100, rank ${c.rank} of 135. Lowest dimension: ${low.label} ${c[low.key].toFixed(1)}` }],
          };
        })}
      />

      <StepCards
        title={`Gameplan: ${master.length} steps`}
        intro="The steps the sources say would strengthen responsible AI governance, one per GIRAI dimension. EarthOS does not rank them."
        steps={master.map((m) => ({
          theme: m.theme,
          title: m.title,
          why: m.why,
          href: details.has(m.theme) ? `/policies/ai/steps/${m.theme}` : undefined,
          meta: `${countries.filter((c) => plans.get(c.iso3)?.some((p) => p.theme === m.theme)).length} of ${countries.length} countries`,
        }))}
      />

      <ImpactPanel impact={impact} />

      <section className="panel p-5">
        <h2 className="eyebrow mb-2">Sources and notes</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-4 text-xs text-muted">
          <li>
            Scores and ranks:{' '}
            <a href={GIRAI} target="_blank" rel="noreferrer" className="text-accent hover:underline">Global Index on Responsible AI 2026, country results</a> and{' '}
            <a href={GIRAI_FINDINGS} target="_blank" rel="noreferrer" className="text-accent hover:underline">key findings</a>, Global Center on AI Governance.
          </li>
          <li>
            Country selection:{' '}
            <a href={VIBRANCY} target="_blank" rel="noreferrer" className="text-accent hover:underline">Stanford HAI Global AI Vibrancy Tool</a>, 2025 release (data through 2024). Stanford says its next update is due by the end of 2026.
          </li>
        </ul>
        <p className="mt-3 max-w-3xl text-xs text-muted">
          GIRAI measures laws, policies, government action and civil society activity on responsible AI, with a human-rights focus. It does not measure how advanced a country&apos;s AI is. Other indices that measure different things rank some of these countries very differently; see Where experts disagree under Impact.
        </p>
        <p className="mt-2 max-w-3xl text-xs text-muted">
          Each country&apos;s gameplan lists GIRAI&apos;s five dimensions, lowest score first. Steps come from the sources named on each step page.
        </p>
      </section>
    </TopicPage>
  );
}
