'use client';

import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import type { Indicator } from '@/lib/indicators';
import type { TargetStatus } from '@/lib/targets';
import { CHART, TIER_THEME } from './theme';
import { InfoTip } from '@/components/ui/InfoTip';

import { formatPeriod as period, formatValue } from '@/lib/format';

export { formatValue };

function Change({ label, delta }: { label: string; delta: number | null }) {
  if (delta === null) return null;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return (
    <span className="whitespace-nowrap">
      <span className="text-subtle">{label}</span>{' '}
      <span className="text-ink-2">
        {sign}
        {formatValue(Math.abs(delta))}
      </span>
    </span>
  );
}

const BETTER_TEXT = { lower: 'Lower is better', higher: 'Higher is better', none: 'No better direction' } as const;

function TargetBlock({ t, unit }: { t: TargetStatus; unit: string }) {
  const source = t.setBy ? (
    t.sourceUrl ? (
      <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
        {t.setBy}
      </a>
    ) : (
      t.setBy
    )
  ) : null;

  if (t.kind === 'direction') {
    return (
      <div className="tag mt-2 text-[9px] text-subtle" title={t.note || undefined}>
        {BETTER_TEXT[t.better]} · {t.label}
        {source && <> · {source}</>}
      </div>
    );
  }

  let pct = 0;
  let bar = 'bg-good';
  let headline = '';
  if (t.kind === 'reach' && t.progress !== null && t.baseline) {
    pct = Math.max(0, Math.min(1, t.progress));
    if (t.progress < 0) {
      bar = 'bg-critical';
      headline = `Moving away from target since ${t.baseline.year}`;
    } else if (t.progress >= 1) {
      headline = 'Target reached';
    } else {
      bar = t.progress >= 0.5 ? 'bg-good' : 'bg-warning';
      headline = `${Math.round(t.progress * 100)}% of the way since ${t.baseline.year}`;
    }
  }
  if (t.kind === 'limit' && t.level !== null && t.limit !== null) {
    const ratio = t.level / t.limit;
    pct = Math.max(0, Math.min(1, ratio));
    bar = ratio >= 1 ? 'bg-critical' : ratio >= 0.9 ? 'bg-elevated' : 'bg-warning';
    headline = t.rebase
      ? `≈${t.level.toFixed(2)} ${unit} above ${t.rebase[0]}–${t.rebase[1]}, of a ${t.limit} ${unit} limit`
      : `≈${t.level.toFixed(2)} ${unit} of ${t.limit} ${unit} limit`;
  }

  return (
    <div className="mt-2" title={t.note || undefined}>
      <div className="tag mb-1 flex items-baseline justify-between gap-2 text-[9px]">
        <span className="text-body">Target: {t.label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line" role="img" aria-label={headline}>
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct * 100}%` }} />
      </div>
      <div className="tag mt-1 flex flex-wrap items-baseline justify-between gap-x-2 text-[9px]">
        <span className="text-muted">{headline}</span>
        {source && <span className="text-subtle">{source}</span>}
      </div>
    </div>
  );
}

export function IndicatorCard({ ind }: { ind: Indicator }) {
  const theme = TIER_THEME[ind.tierId];
  const gradientId = `spark-${ind.id}`;

  return (
    <article className="card flex flex-col p-3">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1">
          <h4 className="text-xs font-bold leading-snug text-ink-2">{ind.name}</h4>
          {ind.about && (
            <InfoTip id={`about-${ind.id}`} label={`What this measures: ${ind.name}`}>
              {ind.about}
            </InfoTip>
          )}
        </div>
        {ind.isIllustrative && (
          <span className="tag shrink-0 rounded border border-warning-line bg-warning-bg/40 px-1.5 py-0.5 text-warning-text">Illustrative</span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={`font-mono text-2xl font-bold ${theme.text}`}>{formatValue(ind.latest.value)}</span>
        <span className="font-mono text-xs text-muted">{ind.unit}</span>
      </div>
      <div className="tag mb-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
        <span className="text-subtle">
          {period(ind.latest.date, ind.annual)}
          {ind.annual && Number(ind.latest.date.slice(0, 4)) < new Date().getFullYear() && ' (latest published)'}
        </span>
        <Change label="1Y" delta={ind.change1y} />
        <Change label="10Y" delta={ind.change10y} />
      </div>

      <div className="-mx-1 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={ind.spark} margin={{ top: 2, right: 2, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.hex} stopOpacity={0.35} />
                <stop offset="95%" stopColor={theme.hex} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip
              cursor={false}
              contentStyle={{ backgroundColor: CHART.tooltipBg, border: `1px solid ${CHART.grid}`, fontSize: 11 }}
              labelFormatter={(_, p) => (p?.[0]?.payload ? period(p[0].payload.date, ind.annual) : '')}
              formatter={(v) => [`${formatValue(Number(v))} ${ind.unit}`, '']}
            />
            <Area type="monotone" dataKey="value" stroke={theme.hex} strokeWidth={1.5} fill={theme.hex} fillOpacity={0.12} dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {ind.target && <TargetBlock t={ind.target} unit={ind.unit} />}

      {ind.note && (
        <p className="mt-2 border-l-2 border-warning-line pl-2 text-[11px] leading-snug text-muted">
          {ind.note.text}{' '}
          <a href={ind.note.url} target="_blank" rel="noreferrer" className="text-accent hover:underline" title={ind.note.source}>
            Source
          </a>
        </p>
      )}

      <div className="tag mt-2 flex items-center justify-between gap-2 text-[9px] text-subtle">
        <span>
          Since {period(ind.first.date, ind.annual)} · {ind.count} {ind.annual ? 'data points' : 'months'}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <a href={`/data?card=${ind.id}#embed`} className="text-accent hover:underline" title={`Share or embed the ${ind.name} card`}>
            Share
          </a>
          <a href={ind.sourceUrl} target="_blank" rel="noreferrer" className="truncate text-accent hover:underline" title={ind.source}>
            Data source
          </a>
        </span>
      </div>
    </article>
  );
}
