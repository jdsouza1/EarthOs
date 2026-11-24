'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TierSnapshot, TierTrendPoint } from '@/lib/types';
import { CHART, TIER_THEME } from './theme';
import { InfoTip } from '@/components/ui/InfoTip';

/** All four tier scores on one timeline, so the reader sees which pillar is moving. */
export function TierTrendChart({ data, tiers }: { data: TierTrendPoint[]; tiers: TierSnapshot[] }) {
  return (
    <figure className="panel m-0 flex h-[340px] flex-col p-5">
      <figcaption className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <h2 className="eyebrow">Scores over time</h2>
          <InfoTip id="tier-trend-about" label="About this chart" align="left">
            Each line is one area&apos;s score (0–100) for every year since {data[0]?.label ?? 'the start'}. Each year is scored using only
            the data that existed then, so the lines show how the picture has changed. Higher is better. Status is the direction over the last 5 years.
          </InfoTip>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-subtle">
          {tiers.map((t) => (
            <span key={t.id} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TIER_THEME[t.id].hex }} />
              {t.name}
            </span>
          ))}
        </div>
      </figcaption>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="label" stroke={CHART.axis} fontSize={10} tickMargin={8} />
            <YAxis stroke={CHART.axis} fontSize={10} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: CHART.tooltipBg, border: `1px solid ${CHART.grid}`, fontSize: 11 }}
              formatter={(v) => Number(v).toFixed(0)}
            />
            {tiers.map((t) => (
              <Line key={t.id} type="monotone" dataKey={t.id} name={t.name} stroke={TIER_THEME[t.id].hex} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-subtle">
        Ranges under other scoring choices: <a href="/methodology#scoring" className="text-accent hover:underline">how scores work</a>.
      </p>
    </figure>
  );
}
