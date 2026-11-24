import type { LongPoint, LongSeries } from '@/lib/longView';

const W = 1000;
const H = 280;
const PAD = { l: 64, r: 16, t: 16, b: 40 };

const fmtYear = (y: number, axis: LongSeries['axis'], end: number) => {
  if (axis === 'years_ago') {
    const ago = end - y;
    if (ago < 1000) return 'Today';
    return `${Math.round(ago / 1000).toLocaleString('en-US')},000 years ago`;
  }
  if (y < 0) return `${Math.abs(y).toLocaleString('en-US')} BCE`;
  return y === 0 ? '1 CE' : `${y}`;
};

function niceTicks(min: number, max: number, n: number) {
  const span = max - min;
  const raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e6) / 1e6);
  return out;
}

/** Reconstructed and measured stretches as separate lines on one long time axis, drawn at build time. */
export function LongViewChart({ s }: { s: LongSeries }) {
  const all: LongPoint[] = [...s.reconstructed, ...s.measured];
  const x0 = Math.min(...all.map((p) => p.year));
  const x1 = Math.max(...all.map((p) => p.year));
  const lows = all.map((p) => p.low ?? p.value);
  const highs = all.map((p) => p.high ?? p.value);
  let y0 = Math.min(...lows);
  let y1 = Math.max(...highs);
  const pad = (y1 - y0) * 0.08;
  y0 = s.id === 'population' ? 0 : y0 - pad;
  y1 += pad;

  const X = (year: number) => PAD.l + ((year - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const Y = (v: number) => H - PAD.b - ((v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
  const line = (pts: LongPoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.year).toFixed(1)},${Y(p.value).toFixed(1)}`).join('');
  const banded = s.reconstructed.filter((p) => p.low !== null);
  const band = banded.length
    ? `M${banded.map((p) => `${X(p.year).toFixed(1)},${Y(p.high!).toFixed(1)}`).join('L')}L${[...banded]
        .reverse()
        .map((p) => `${X(p.year).toFixed(1)},${Y(p.low!).toFixed(1)}`)
        .join('L')}Z`
    : null;

  const yTicks = niceTicks(y0, y1, 4);
  const xTicks =
    s.axis === 'years_ago'
      ? [800000, 600000, 400000, 200000, 0].map((ago) => x1 - ago)
      : s.id === 'population'
        ? [-10000, -8000, -6000, -4000, -2000, 0, 2000]
        : niceTicks(x0, x1, 5);
  const last = s.measured.at(-1) ?? s.reconstructed.at(-1)!;
  const stripX = s.dashboardFrom !== null ? X(s.dashboardFrom) : null;
  const label = `${s.title}. ${s.reconstructedLabel}, ${fmtYear(s.reconstructed[0].year, s.axis, x1)} to ${fmtYear(
    s.reconstructed.at(-1)!.year,
    s.axis,
    x1,
  )}. ${s.measuredLabel}. Latest ${last.value} ${s.unit} in ${last.year}.`;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={Y(t)} y2={Y(t)} className="stroke-line" strokeWidth={1} />
            <text x={PAD.l - 8} y={Y(t) + 4} textAnchor="end" className="fill-subtle text-[13px]">
              {t.toLocaleString('en-US')}
            </text>
          </g>
        ))}
        {xTicks
          .filter((t) => t >= x0 - 1 && t <= x1 + 1)
          .map((t) => (
            <text key={`x${t}`} x={X(t)} y={H - 14} textAnchor={X(t) > W - 80 ? 'end' : X(t) < PAD.l + 40 ? 'start' : 'middle'} className="fill-subtle text-[13px]">
              {fmtYear(t, s.axis, x1)}
            </text>
          ))}
        {stripX !== null && (
          <g>
            <rect x={Math.min(stripX, W - PAD.r - 4)} y={PAD.t} width={Math.max(W - PAD.r - stripX, 4)} height={H - PAD.t - PAD.b} className="fill-accent" opacity={0.15} />
            <text x={Math.min(stripX, W - PAD.r - 4) - 6} y={PAD.t + 14} textAnchor="end" className="fill-accent text-[13px]">
              Dashboard chart: from {s.dashboardFrom}
            </text>
          </g>
        )}
        {band && <path d={band} className="fill-subtle" opacity={0.25} />}
        <path d={line(s.reconstructed)} fill="none" className="stroke-subtle" strokeWidth={1.75} />
        {s.measured.length > 0 && <path d={line(s.measured)} fill="none" className="stroke-accent" strokeWidth={2.5} />}
      </svg>
      <figcaption className="tag mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-subtle">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded bg-subtle" />
          Reconstructed: {s.reconstructedLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-4 rounded bg-accent" />
          Measured: {s.measuredLabel}
        </span>
        {stripX !== null && (
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-3 rounded-sm bg-accent opacity-30" />
            Span of the dashboard&apos;s own chart
          </span>
        )}
      </figcaption>
    </figure>
  );
}
