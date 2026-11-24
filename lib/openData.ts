import { getDashboardData } from './data';
import { getIndicators, loadIndicatorSeries } from './indicators';
import { getRefreshStatus } from './refresh';
import { GITHUB_URL, SITE_URL } from './site';

/** Headers for every download: anyone may fetch them, from any site. */
export const OPEN_HEADERS = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=3600' } as const;

const NOTE =
  'Values are as published by each named source, which keeps its own terms of use. Area scores are EarthOS’s own work, method at ' +
  `${SITE_URL}/methodology. Code and data history: ${GITHUB_URL}`;

/** The latest reading of every indicator and the four area scores, in one small file. */
export async function latestJson() {
  const [indicators, data, refresh] = await Promise.all([getIndicators(), getDashboardData(), getRefreshStatus()]);
  return {
    name: "EarthOS: humanity's vital signs",
    site: SITE_URL,
    checked_at: refresh?.last.checkedAt ?? null,
    next_check: refresh?.nextCheck ?? null,
    note: NOTE,
    areas: data.tiers.map((t) => ({
      id: t.id,
      name: t.name,
      score: t.score,
      status: t.status,
      range: t.range ? { low: t.range[0], high: t.range[1] } : null,
      label: 'EarthOS calculation (0 to 100)',
    })),
    indicators: indicators
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((i) => ({
        id: i.id,
        name: i.name,
        area: i.tierId,
        unit: i.unit,
        latest: { date: i.latest.date, value: i.latest.value },
        change_1y: i.change1y,
        change_10y: i.change10y,
        frequency: i.annual ? 'yearly' : 'monthly',
        source: i.source,
        source_url: i.sourceUrl,
        retrieved_at: i.retrievedAt,
        label: 'measured',
        history: `${SITE_URL}/data/series/${i.id}.json`,
        embed: `${SITE_URL}/embed/${i.id}`,
      })),
  };
}

/** One indicator's full history. Null if the id is unknown. */
export async function seriesJson(id: string) {
  const s = (await loadIndicatorSeries()).get(id);
  if (!s) return null;
  return {
    id,
    name: s.meta.name,
    area: s.meta.tier_id,
    unit: s.meta.unit,
    source: s.meta.source,
    source_url: s.meta.source_url,
    retrieved_at: s.meta.retrieved_at,
    label: 'measured',
    note: NOTE,
    points: s.points.map((p) => ({ date: p.date, value: p.value })),
  };
}

export async function seriesIds() {
  return [...(await loadIndicatorSeries()).keys()].sort();
}
