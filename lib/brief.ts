import { getDashboardData } from './data';
import { getIndicators, type Indicator } from './indicators';
import { getLevers } from './levers';
import { getKeyNumbers } from './keyNumbers';
import { getExpertForecasts } from './forecasts';
import { POLICY_TOPICS } from './policyTopics';
import { getRefreshStatus } from './refresh';

/**
 * The Brief as plain data: every sentence's numbers worked out here, so the same object can be shown live
 * on /report and saved each month (data/briefs/YYYY-MM.json, written by scripts/snapshot-brief.ts in the
 * monthly refresh) to build the archive. Bump BRIEF_VERSION if the shape changes.
 */
export const BRIEF_VERSION = 1;

export interface Linked {
  sourceName: string;
  sourceUrl: string;
}
export interface BriefData {
  version: number;
  /** YYYY-MM: the month of the data check that produced it. */
  key: string;
  /** "November 2026". */
  issueLabel: string;
  /** Newest download date among the indicators, YYYY-MM-DD. */
  issued: string;
  indicatorCount: number;
  tiers: { id: string; name: string; score: number; status: string }[];
  alert: ({ name: string; valueText: string; changeText: string | null } & Linked) | null;
  warming: { name: string; levelText: string; limitText: string; label: string } | null;
  weakest: ({ name: string; score: number; latestText: string | null; lever: ({ text: string; who: string } & Linked) | null } & Linked)[];
  gains: ({ id: string; name: string; latestText: string; changeText: string } & Linked)[];
  policy: ({ topicId: string; topicLabel: string; label: string; value: string; context: string; confidence: string } & Linked)[];
  forecast: { lo: string; hi: string; count: number } | null;
}

const LONG_MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const SHORT_MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const when = (annual: boolean, date: string) => (annual ? date.slice(0, 4) : SHORT_MONTH.format(new Date(date)));
export const issueLabel = (key: string) => LONG_MONTH.format(new Date(`${key}-01T00:00:00Z`));

function num(v: number) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (a >= 1000) return Math.round(v).toLocaleString('en-US');
  if (a >= 100) return v.toFixed(1);
  return String(Number(v.toFixed(2)));
}
const withUnit = (v: number, unit: string) => (unit.startsWith('%') ? `${num(v)}${unit}` : `${num(v)} ${unit}`);
function pct(v: number) {
  if (v >= 10) return `${Math.round(v)}%`;
  if (v >= 1) return `${Number(v.toFixed(2))}%`;
  return `${Number(v.toPrecision(2))}%`;
}
function gain(i: Indicator): number | null {
  const better = i.target?.better;
  if (!better || better === 'none' || i.change10y === null) return null;
  const before = i.latest.value - i.change10y;
  if (before === 0) return null;
  const change = (i.change10y / Math.abs(before)) * 100;
  return better === 'higher' ? change : -change;
}
function changeText(i: Indicator, g: number) {
  const d = i.change10y!;
  if (i.unit.startsWith('%')) return `${d > 0 ? 'up' : 'down'} ${num(Math.abs(d))} points in 10 years`;
  return `${d > 0 ? 'up' : 'down'} ${Math.round(Math.abs(g))}% in 10 years`;
}
const CONFIDENCE = { measured: 'Measured', modelled: 'Modelled', expert: 'Expert' } as Record<string, string>;

/** The Brief for the data as it stands. `key` defaults to the month of the latest data check (data/refresh.csv). */
export async function buildBrief(key?: string): Promise<BriefData> {
  const [data, indicators, levers, forecasts, keyNumbers, refresh] = await Promise.all([
    getDashboardData(),
    getIndicators(),
    getLevers(),
    getExpertForecasts(),
    Promise.all(POLICY_TOPICS.filter((t) => t.href).map(async (t) => ({ topic: t, first: (await getKeyNumbers(t.id))[0] }))),
    getRefreshStatus(),
  ]);
  const issued = indicators.map((i) => i.retrievedAt).sort().at(-1) ?? '';
  const k = key ?? (refresh?.last.checkedAt ?? issued).slice(0, 7);
  const byName = new Map(indicators.map((i) => [i.name, i]));
  const alert = data.alerts[0];
  const warming = indicators.find((i) => i.target?.kind === 'limit' && i.target.level !== null);
  const ext = forecasts.filter((f) => f.outcome === 'extinction' && f.risk === 'All causes' && f.horizon === '2100');

  return {
    version: BRIEF_VERSION,
    key: k,
    issueLabel: k ? issueLabel(k) : '',
    issued,
    indicatorCount: indicators.length,
    tiers: [...data.tiers].sort((a, b) => b.score - a.score).map((t) => ({ id: t.id, name: t.name, score: t.score, status: t.status })),
    alert: alert
      ? {
          name: alert.name,
          valueText: withUnit(alert.latest.value, alert.unit),
          changeText:
            alert.change1y !== null
              ? `It is ${alert.change1y >= 0 ? 'up' : 'down'} ${withUnit(Math.abs(alert.change1y), alert.unit)} on a year earlier (${when(alert.annual, alert.latest.date)}).`
              : null,
          sourceName: alert.source,
          sourceUrl: alert.sourceUrl,
        }
      : null,
    warming:
      warming?.target?.level != null && warming.target.limit != null
        ? { name: warming.name, levelText: withUnit(warming.target.level, warming.unit), limitText: withUnit(warming.target.limit, warming.unit), label: warming.target.label }
        : null,
    weakest: data.bottlenecks.slice(0, 3).map((b) => {
      const ind = byName.get(b.name);
      const lever = ind ? levers.get(ind.id)?.[0] : undefined;
      return {
        name: b.name,
        score: Math.round(b.score),
        latestText: ind ? `${withUnit(ind.latest.value, ind.unit)} (${when(ind.annual, ind.latest.date)})` : null,
        sourceName: ind?.source ?? '',
        sourceUrl: ind?.sourceUrl ?? '',
        lever: lever ? { text: lever.lever, who: lever.who.join('; '), sourceName: lever.source, sourceUrl: lever.sourceUrl } : null,
      };
    }),
    gains: indicators
      .map((i) => ({ i, g: gain(i) }))
      .filter((x): x is { i: Indicator; g: number } => x.g !== null && x.g > 0)
      .sort((a, b) => b.g - a.g)
      .slice(0, 3)
      .map(({ i, g }) => ({
        id: i.id,
        name: i.name,
        latestText: `${withUnit(i.latest.value, i.unit)} (${when(i.annual, i.latest.date)})`,
        changeText: changeText(i, g),
        sourceName: i.source,
        sourceUrl: i.sourceUrl,
      })),
    policy: keyNumbers
      .filter((x) => x.first)
      .map(({ topic, first }) => ({
        topicId: topic.id,
        topicLabel: topic.label,
        label: first!.label,
        value: first!.value,
        context: first!.context,
        confidence: CONFIDENCE[first!.confidence] ?? first!.confidence,
        sourceName: first!.sourceName,
        sourceUrl: first!.sourceUrl,
      })),
    forecast: ext.length
      ? { lo: pct(Math.min(...ext.map((f) => f.value))), hi: pct(Math.max(...ext.map((f) => f.value))), count: ext.length }
      : null,
  };
}
