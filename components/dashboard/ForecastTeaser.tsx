import Link from 'next/link';
import { getExpertForecasts } from '@/lib/forecasts';

function pct(v: number) {
  if (v >= 10) return `${Math.round(v)}%`;
  if (v >= 1) return `${Number(v.toFixed(2))}%`;
  return `${Number(v.toPrecision(2))}%`;
}

/** The spread of published all-cause extinction estimates for 2100, worked out from the data. Not averaged; EarthOS adds no estimate of its own. */
export async function ForecastTeaser() {
  const ext = (await getExpertForecasts()).filter((f) => f.outcome === 'extinction' && f.risk === 'All causes' && f.horizon === '2100');
  if (ext.length === 0) return null;
  const lo = Math.min(...ext.map((f) => f.value));
  const hi = Math.max(...ext.map((f) => f.value));
  return (
    <section className="panel flex flex-col gap-2 p-5" aria-labelledby="forecast-title">
      <h2 id="forecast-title" className="eyebrow">Expert estimates</h2>
      <span className="font-mono text-3xl font-bold leading-none text-ink">
        {pct(lo)} – {pct(hi)}
      </span>
      <p className="text-sm text-body">
        Human extinction by 2100: the lowest and highest of {ext.length} published estimates, not averaged. Expert judgement.{' '}
        <Link href="/forecasts" className="text-accent hover:underline">
          All forecasts
        </Link>
      </p>
    </section>
  );
}
