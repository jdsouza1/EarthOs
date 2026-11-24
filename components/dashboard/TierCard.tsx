'use client';

import { Bar, BarChart, ErrorBar, Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import type { TierSnapshot } from '@/lib/types';
import { CHART, TIER_THEME } from './theme';
import { InfoTip } from '@/components/ui/InfoTip';

/**
 * Takes the tier data only; the icon/colours are looked up here.
 * (Icon components can't be passed as props from a Server Component to a Client Component.)
 */
export function TierCard({ tier }: { tier: TierSnapshot }) {
  const theme = TIER_THEME[tier.id];
  const Icon = theme.icon;
  // Whisker per year: distance from the score down to the lowest and up to the highest variant.
  const data = tier.history.map((h) => ({
    ...h,
    err: h.low !== undefined && h.high !== undefined ? [Math.max(0, h.score - h.low), Math.max(0, h.high - h.score)] : undefined,
  }));
  const whisker = <ErrorBar dataKey="err" width={3} strokeWidth={1} stroke={theme.hex} opacity={0.5} />;
  const tooltip = (
    <Tooltip
      cursor={false}
      contentStyle={{ backgroundColor: CHART.tooltipBg, border: `1px solid ${CHART.grid}`, fontSize: 11 }}
      labelFormatter={(_, p) => {
        const d = p?.[0]?.payload;
        return d ? `${d.label}${d.low !== undefined ? ` · range ${d.low}–${d.high}` : ''}` : '';
      }}
    />
  );

  return (
    <article className={`relative flex h-48 flex-col rounded-lg border bg-surface/60 p-4 shadow-lg backdrop-blur-md hover:z-20 focus-within:z-20 ${theme.border}`}>
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} className={theme.text} />
          <h3 className={`text-xs font-bold ${theme.text}`}>{tier.name}</h3>
          <InfoTip id={`tier-${tier.id}`} label={`About ${tier.name}`} align="left" anchorToParent>
            {tier.about && <span className="mb-1.5 block">{tier.about}</span>}
            <span className="block">
              <b className="text-ink-2">Score</b>: average of this tier&apos;s indicators, 0–100 (100 = targets met or strongly improving).
            </span>
            <span className="block">
              <b className="text-ink-2">Range</b>: lowest and highest score under other reasonable scoring choices. The thin bars on the chart show this range for each year.
            </span>
            <span className="block">
              <b className="text-ink-2">Status</b>: change over the last 5 years (Improving, Stagnant or Degrading).
            </span>
          </InfoTip>
        </div>
        <div className="text-right">
          <div className={`font-mono text-2xl font-bold ${theme.text}`}>
            {tier.score}
            <span className="text-sm text-subtle">/100</span>
          </div>
          {tier.range && (
            <a
              href="/methodology#scoring"
              title="Lowest and highest score under reasonable changes to the method"
              className="block whitespace-nowrap font-mono text-[10px] text-subtle hover:text-body"
            >
              range {tier.range[0]}–{tier.range[1]}
            </a>
          )}
          <div className="text-[10px] text-muted">{tier.status}</div>
        </div>
      </div>

      <div className="-mx-2 mt-2 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {tier.chartType === 'line' ? (
            <LineChart data={data}>
              <YAxis domain={[0, 100]} hide />
              {tooltip}
              <Line type="monotone" dataKey="score" stroke={theme.hex} strokeWidth={2} dot={false}>
                {whisker}
              </Line>
            </LineChart>
          ) : (
            <BarChart data={data}>
              <YAxis domain={[0, 100]} hide />
              {tooltip}
              <Bar dataKey="score" fill={theme.hex} radius={[2, 2, 0, 0]} fillOpacity={0.8}>
                {whisker}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </article>
  );
}
