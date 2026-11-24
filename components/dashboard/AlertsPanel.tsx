import type { Alert, TierSnapshot } from '@/lib/types';
import { TIER_THEME } from './theme';
import { InfoTip } from '@/components/ui/InfoTip';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const when = (a: Alert) => (a.annual ? a.latest.date.slice(0, 4) : `${MONTHS[Number(a.latest.date.slice(5, 7)) - 1]} ${a.latest.date.slice(0, 4)}`);
const fmt = (n: number) => (Math.abs(n) >= 100 ? Math.round(n).toLocaleString('en-US') : String(Math.round(n * 100) / 100));
const change = (a: Alert) => (a.change1y === null ? '' : `${a.change1y >= 0 ? 'Up' : 'Down'} ${fmt(Math.abs(a.change1y))} ${a.unit} on a year earlier.`);

/** Indicators whose score fell most over the latest year: the largest fall shown big, the rest as a short list. */
export function AlertsPanel({ alerts, checked, tiers }: { alerts: Alert[]; checked: number; tiers: TierSnapshot[] }) {
  const tierName = (id: Alert['tierId']) => tiers.find((t) => t.id === id)?.name ?? id;
  const [top, ...rest] = alerts;

  return (
    <section className="panel flex flex-col gap-2 p-5" aria-labelledby="alerts-title">
      <div className="flex items-center gap-1.5">
        <h2 id="alerts-title" className="eyebrow">Moving the wrong way</h2>
        <InfoTip id="alerts-about" label="About this list" align="left">
          Indicators whose score fell the most over the latest year, largest fall first. Each year is scored using only the data published by then,
          with the same method as the rest of the dashboard. A fall under half a point is not listed. {alerts.length} of {checked} scored indicators
          fell; the rest held steady or improved. Monthly data is scored on 12-month averages, so one month can differ from the trend.
        </InfoTip>
      </div>
      {!top ? (
        <p className="text-sm text-muted">No indicator&apos;s score fell over the latest year.</p>
      ) : (
        <>
          <span className="text-sm text-muted">{top.name}</span>
          <span className="font-mono text-4xl font-bold leading-none text-critical">
            {fmt(top.latest.value)} <span className="text-lg text-muted">{top.unit}</span>
          </span>
          <p className="text-sm text-body">
            {when(top)}. {change(top)}{' '}
            <a href={top.sourceUrl} target="_blank" rel="noreferrer" className="text-subtle hover:text-accent hover:underline">
              {top.source}
            </a>
          </p>
          {rest.length > 0 && (
            <ul className="mt-2 flex flex-col">
              {rest.map((a) => (
                <li key={a.id} className="flex items-center gap-3 border-t border-line py-2.5 text-sm">
                  <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: TIER_THEME[a.tierId].hex }} />
                  <span className="min-w-0 flex-1 text-ink" title={tierName(a.tierId)}>{a.name}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {fmt(a.latest.value)} {a.unit} · {when(a)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
