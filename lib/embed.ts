import type { Indicator } from './indicators';
import { dark, light } from './tokens';
import { formatDelta, formatPeriod, formatValue } from './format';
import { formatDay, type RefreshStatus } from './refresh';
import { SITE_URL } from './site';

/** Size the embed code asks for. The card itself stretches to the frame's width. */
export const EMBED_HEIGHT = 230;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** SVG path for the sparkline in a w × h box, oldest point on the left. */
export function sparkPath(points: { value: number }[], w: number, h: number, pad = 2) {
  if (points.length < 2) return { line: '', area: '' };
  const vals = points.map((p) => p.value);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const xy = vals.map((v, i) => [(i / (vals.length - 1)) * w, pad + (1 - (v - lo) / span) * (h - 2 * pad)] as const);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return { line, area: `${line} L${w} ${h} L0 ${h} Z` };
}

export function embedCode(id: string) {
  return `<iframe src="${SITE_URL}/embed/${id}" title="EarthOS indicator" width="100%" height="${EMBED_HEIGHT}" style="max-width:380px;border:0" loading="lazy"></iframe>`;
}

/**
 * A self-contained card: no scripts, no outside requests, follows the reader's light or dark setting.
 * Served as a static page at /embed/<id>, for other sites to show in an iframe and for link previews.
 */
export function embedHtml(ind: Indicator, refresh: RefreshStatus | null) {
  const tier = `tier-${ind.tierId}` as const;
  const { line, area } = sparkPath(ind.spark, 300, 48);
  const page = `${SITE_URL}/embed/${ind.id}`;
  const title = `${ind.name}: ${formatValue(ind.latest.value)} ${ind.unit} (${formatPeriod(ind.latest.date, ind.annual)})`;
  const changes = [ind.change1y !== null ? `1Y ${formatDelta(ind.change1y)}` : '', ind.change10y !== null ? `10Y ${formatDelta(ind.change10y)}` : '']
    .filter(Boolean)
    .join(' · ');
  const checked = refresh ? `Checked ${formatDay(refresh.last.checkedAt)}` : `Downloaded ${formatDay(ind.retrievedAt)}`;
  const palette = (p: typeof light | typeof dark) =>
    `--bg:${p.surface};--line:${p.line};--ink:${p.ink};--muted:${p.muted};--subtle:${p.subtle};--accent:${p.accent};--tier:${p[tier]}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · EarthOS</title>
<meta name="description" content="${esc(`${title}. Source: ${ind.source}. From EarthOS, a free dashboard of humanity's vital signs.`)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(`Source: ${ind.source}. Every number on EarthOS links to its source.`)}">
<meta property="og:image" content="${page}/image">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="${page}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<style>
:root{${palette(light)};color-scheme:light dark}
@media (prefers-color-scheme:dark){:root{${palette(dark)}}}
*{box-sizing:border-box;margin:0}
body{font:13px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:transparent;color:var(--ink);padding:4px}
.card{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:14px 16px 12px;max-width:380px;margin:0 auto}
.top{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.name{font-weight:700;font-size:13px}
.brand{font-size:11px;color:var(--subtle);text-decoration:none;white-space:nowrap}
.val{display:flex;gap:6px;align-items:baseline;margin-top:6px}
.num{font:700 30px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--tier)}
.unit{color:var(--muted);font-size:12px}
.meta{color:var(--subtle);font-size:11px;margin-top:4px}
svg{display:block;width:100%;height:48px;margin-top:8px}
.foot{display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:10.5px;color:var(--subtle)}
.foot a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
</style>
</head>
<body>
<div class="card">
<div class="top"><span class="name">${esc(ind.name)}</span><a class="brand" href="${SITE_URL}" target="_blank" rel="noopener">EarthOS ↗</a></div>
<div class="val"><span class="num">${esc(formatValue(ind.latest.value))}</span><span class="unit">${esc(ind.unit)}</span></div>
<div class="meta">${esc(formatPeriod(ind.latest.date, ind.annual))}${changes ? ` · ${esc(changes)}` : ''}</div>
<svg viewBox="0 0 300 48" preserveAspectRatio="none" role="img" aria-label="${esc(`${ind.name} since ${formatPeriod(ind.spark[0]?.date ?? ind.first.date, ind.annual)}`)}">
<path d="${area}" fill="var(--tier)" fill-opacity=".14"/>
<path d="${line}" fill="none" stroke="var(--tier)" stroke-width="1.6" vector-effect="non-scaling-stroke"/>
</svg>
<div class="foot"><a href="${esc(ind.sourceUrl)}" target="_blank" rel="noopener" title="${esc(ind.source)}">Source</a><span>${esc(checked)}</span><a href="${SITE_URL}" target="_blank" rel="noopener">All 20 vital signs →</a></div>
</div>
</body>
</html>`;
}
