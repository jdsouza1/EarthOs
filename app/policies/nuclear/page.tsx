import type { Metadata } from 'next';
import { getGameplans, getMasterPlan } from '@/lib/policies';
import { getStepDetails } from '@/lib/steps';
import { getNuclear } from '@/lib/nuclear';
import { getImpact } from '@/lib/impact';
import { ImpactPanel } from '@/components/policies/ImpactPanel';
import { TopicPage } from '@/components/policies/TopicPage';
import { RankList, type RankRow } from '@/components/policies/RankList';
import { StepCards } from '@/components/policies/StepCards';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Nuclear weapons — Policies — EarthOS' };

const NTI = 'https://www.ntiindex.org/results/';
const SIPRI = 'https://www.sipri.org/yearbook/2026';
const BAN = 'https://banmonitor.org/profiles';

const fmt = (n: number) => n.toLocaleString('en-US');
const change = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

export default async function NuclearPage() {
  const [countries, impact, master, plans, details] = await Promise.all([getNuclear(), getImpact('nuclear'), getMasterPlan('nuclear'), getGameplans('nuclear'), getStepDetails('nuclear')]);
  const maxStock = Math.max(1, ...countries.map((c) => c.stockpile));
  const total = countries.reduce((t, c) => t + c.stockpile, 0);

  return (
    <TopicPage
      topic="nuclear"
      title="Nuclear weapons: how safely they are guarded, and what would lower the risk"
      summary={<>The nine nuclear-armed countries hold about {fmt(total)} warheads in military stockpiles (SIPRI, January 2026). The Nuclear Weapons Ban Monitor lists all nine as opposed to the UN ban treaty.</>}
      aboutLabel="About these scores"
      about={
        <>
          Scores come from the Nuclear Threat Initiative&apos;s Nuclear Security Index (2026). It measures how well a
          country protects weapons-usable nuclear material from theft and sabotage: quantities and sites, security and
          control, global norms, domestic commitments and risk environment. It does not measure disarmament. EarthOS
          shows the scores as published and does not rate countries itself.
        </>
      }
    >
      <RankList
        title="Nuclear-armed countries, lowest security score first"
        legend={<>Blue bar: security score out of 100 (NTI). Grey bar: warheads in the military stockpile (SIPRI). One is about safety, the other about size.</>}
        rows={countries.map((c): RankRow => ({
          key: c.iso3,
          name: c.country,
          href: (plans.get(c.iso3)?.length ?? 0) > 0 ? `/policies/nuclear/${c.iso3.toLowerCase()}` : undefined,
          steps: plans.get(c.iso3)?.length ?? 0,
          note: c.note || undefined,
          metrics: [
            { label: 'Security score', value: <>{c.ntiScore} <span className="text-subtle">/ 100</span></>, pct: c.ntiScore, title: `NTI Nuclear Security Index 2026: ${c.ntiScore} (${change(c.ntiChange)} since 2023, rank ${c.ntiRank} of 22)` },
            { label: 'Warhead stockpile', value: <>{fmt(c.stockpile)} <span className="text-subtle">warheads</span></>, pct: (c.stockpile / maxStock) * 100, tone: 'muted', title: c.totalInventory > c.stockpile ? `${fmt(c.totalInventory)} including retired warheads` : undefined },
          ],
        }))}
      />

      <StepCards
        title={`Gameplan: ${master.length} steps`}
        intro="The steps the sources say would lower nuclear risk. EarthOS does not rank them."
        steps={master.map((m) => ({
          theme: m.theme,
          title: m.title,
          why: m.why,
          href: details.has(m.theme) ? `/policies/nuclear/steps/${m.theme}` : undefined,
          meta: `${countries.filter((c) => plans.get(c.iso3)?.some((p) => p.theme === m.theme)).length} of ${countries.length} countries`,
        }))}
      />

      <ImpactPanel impact={impact} />

      <section className="panel p-5">
        <h2 className="eyebrow mb-2">Sources and notes</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-4 text-xs text-muted">
          <li>
            Security score, change and rank:{' '}
            <a href={NTI} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              NTI Nuclear Security Index, 2026 edition
            </a>
            . The rank is among the 22 countries that hold weapons-usable nuclear material. Higher scores are better.
          </li>
          <li>
            Warhead stockpiles:{' '}
            <a href={SIPRI} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              SIPRI Yearbook 2026
            </a>
            , January 2026. All figures are estimates, and some are very uncertain.
          </li>
          <li>
            Treaty position:{' '}
            <a href={BAN} target="_blank" rel="noreferrer" className="text-accent hover:underline">
              Nuclear Weapons Ban Monitor 2026
            </a>{' '}
            (Norwegian People&apos;s Aid, with the Federation of American Scientists), based on each country&apos;s UN vote on the ban treaty.
          </li>
        </ul>
        <p className="mt-3 max-w-3xl text-xs text-muted">
          The score is about security, not about how many weapons a country has. The stockpile bar is about size, not about
          safety. Security scores change and rank are in each bar&apos;s tooltip and on each country page.
        </p>
        <p className="mt-2 max-w-3xl text-xs text-muted">
          Gameplan security steps come from the same NTI Index country profiles. Steps on arms control and risk reduction come from the sources named on each step page.
        </p>
      </section>
    </TopicPage>
  );
}
