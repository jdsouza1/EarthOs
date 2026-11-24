'use client';

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { TierSnapshot } from '@/lib/types';
import { CHART } from './theme';
import { colors } from '@/lib/tokens';
import { InfoTip } from '@/components/ui/InfoTip';

/** All four tier scores at a glance, with the low–high range under other reasonable scoring choices. */
export function ReadinessRadar({ tiers }: { tiers: TierSnapshot[] }) {
  const data = tiers.map((t) => ({ tier: `${t.name} · ${t.score}`, score: t.score, low: t.range?.[0] ?? t.score, high: t.range?.[1] ?? t.score }));

  return (
    <section className="panel flex h-80 flex-col p-4 lg:col-span-5">
      <div className="mb-1 flex items-center gap-1.5">
        <h3 className="eyebrow">Readiness at a Glance</h3>
        <InfoTip id="radar-about" label="About this chart" align="left">
          Each corner is one tier&apos;s score today, 0–100 (higher is better), the same numbers as on Tier Scores Over Time. The dashed lines show the
          lowest and highest score each tier gets under other reasonable scoring choices.
        </InfoTip>
      </div>
      <p className="tag mb-1 text-subtle">Tier scores today, 0–100 · dashed lines = range under other scoring choices</p>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="62%" margin={{ top: 8, right: 40, bottom: 8, left: 40 }}>
            <PolarGrid stroke={CHART.grid} />
            <PolarAngleAxis dataKey="tier" tick={{ fill: colors.muted, fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 100]} tickCount={5} tick={false} axisLine={false} />
            <Tooltip
              contentStyle={{ backgroundColor: CHART.tooltipBg, border: `1px solid ${CHART.grid}`, fontSize: 11 }}
              formatter={(v, name) => [Number(v).toFixed(0), name]}
            />
            <Radar name="Highest" dataKey="high" stroke={colors.subtle} strokeDasharray="3 3" fill={colors.accent} fillOpacity={0.08} />
            <Radar name="Score" dataKey="score" stroke={colors.accent} strokeWidth={2} fill={colors.accent} fillOpacity={0.25} />
            <Radar name="Lowest" dataKey="low" stroke={colors.subtle} strokeDasharray="3 3" fill="transparent" />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
