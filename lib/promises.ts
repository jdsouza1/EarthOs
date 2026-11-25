import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';
import { getIndicators } from './indicators';

const FILE = 'promises.csv';

/**
 * Public commitments beside the measured number (data/promises.csv). EarthOS gives no verdict on a
 * promise whose deadline is still ahead: it shows what was promised, the latest figure, and what a
 * named source projects. Only promises whose deadline has passed carry a result, and that result is
 * the source's finding, not ours. Where a promise matches a live indicator the "now" figure is read
 * from data/indicators.csv, so it moves with the monthly refresh.
 */
export type PromiseGroup = 'open' | 'standing' | 'passed';
export type PromiseResult = 'met' | 'met_late' | 'missed';
export type Kind = 'measured' | 'modelled' | 'expert';
export const KIND_LABEL: Record<Kind, string> = { measured: 'Measured', modelled: 'Modelled', expert: 'Expert judgement' };
export const GROUPS: PromiseGroup[] = ['open', 'standing', 'passed'];
const RESULTS: PromiseResult[] = ['met', 'met_late', 'missed'];

interface Link {
  name: string;
  url: string;
}

export interface Pledge {
  id: string;
  order: number;
  group: PromiseGroup;
  area: string;
  promise: string;
  who: string;
  made: number;
  /** Deadline year, or null when the promise has none. */
  deadline: number | null;
  promised: string;
  now: { figure: string; text: string; asOf: string; kind: Kind; source: Link };
  /** Share of the way from the baseline year to the goal, when the live indicator has an official target. */
  progress: { share: number; since: number } | null;
  result: PromiseResult | null;
  outlook: { text: string; kind: Kind; source: Link } | null;
  source: Link;
  note: string;
  checked: string;
}

/** Indicator rows store the download link; a reader wants the page that shows the chart. */
function readablePage(url: string) {
  if (/^https:\/\/ourworldindata\.org\/grapher\//.test(url)) return url.replace(/\.csv(\?.*)?$/, '');
  if (/^https:\/\/data\.giss\.nasa\.gov\/gistemp\//.test(url)) return 'https://data.giss.nasa.gov/gistemp/';
  return url;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function getPromises(): Promise<Pledge[]> {
  const text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  const indicators = new Map((await getIndicators()).map((i) => [i.id, i]));
  const seen = new Set<string>();

  const out = parseCsv(text).map((r, i) => {
    const fail = (m: string): never => {
      throw new Error(`data/${FILE} line ${i + 2}: ${m}`);
    };
    const https = (k: string) => {
      if (!/^https:\/\//.test(r[k] ?? '')) fail(`${k} must be an https link`);
      return r[k];
    };
    const kind = (k: string): Kind => {
      if (!(r[k] in KIND_LABEL)) fail(`${k} must be measured, modelled or expert`);
      return r[k] as Kind;
    };
    for (const k of ['id', 'area', 'promise', 'who', 'promised', 'promise_source']) if (!r[k]) fail(`${k} is required`);
    if (seen.has(r.id)) fail(`duplicate id ${r.id}`);
    seen.add(r.id);
    if (!/^\d+$/.test(r.order ?? '')) fail('order must be a number');
    if (!GROUPS.includes(r.group as PromiseGroup)) fail(`group must be one of ${GROUPS.join(', ')}`);
    if (!/^\d{4}$/.test(r.made ?? '')) fail('made must be a year');
    if (r.deadline && !/^\d{4}$/.test(r.deadline)) fail('deadline must be a year or empty');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked ?? '')) fail('checked must be YYYY-MM-DD');
    const group = r.group as PromiseGroup;
    const deadline = r.deadline ? Number(r.deadline) : null;
    const thisYear = Number(r.checked.slice(0, 4));
    if (group === 'open' && deadline !== null && deadline < thisYear) fail('an open promise cannot have a deadline in the past; move it to passed with its result');
    if (group === 'passed' && (deadline === null || deadline > thisYear)) fail('a passed promise needs a deadline that has passed');
    if (group === 'standing' && deadline !== null) fail('a standing promise has no deadline');
    if (r.result && !RESULTS.includes(r.result as PromiseResult)) fail(`result must be one of ${RESULTS.join(', ')} or empty`);
    if (group === 'passed' && !r.result) fail('a passed promise needs a result');
    if (group !== 'passed' && r.result) fail('only a promise whose deadline has passed carries a result');

    let now: Pledge['now'];
    let progress: Pledge['progress'] = null;
    if (r.now_mode === 'indicator' || r.now_mode === 'target_level') {
      const ind = indicators.get(r.indicator_id) ?? fail(`unknown indicator_id "${r.indicator_id}"`);
      if (!r.now_unit) fail('now_unit is required when the figure comes from an indicator');
      const decimals = Number(r.now_decimals || 0);
      let value = ind.latest.value * Number(r.now_scale || 1);
      if (r.now_mode === 'target_level') {
        if (ind.target?.level == null) fail(`${r.indicator_id} has no limit-type target to read a level from`);
        value = ind.target!.level!;
      }
      const d = ind.latest.date;
      const asOf = r.now_mode === 'target_level' ? `12 months to ${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` : ind.annual ? d.slice(0, 4) : `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
      now = {
        figure: value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
        text: r.now_unit,
        asOf,
        kind: 'measured',
        source: { name: ind.source, url: readablePage(ind.sourceUrl) },
      };
      const t = ind.target;
      if (r.show_progress === 'yes') {
        // Only where the indicator's official target is the same goal as this promise.
        if (!(t && t.kind === 'reach' && t.progress !== null && t.baseline)) fail(`${r.indicator_id} has no reach-type target, so show_progress cannot be yes`);
        progress = { share: t!.progress!, since: t!.baseline!.year };
      } else if (r.show_progress) fail('show_progress must be yes or empty');
    } else if (r.now_mode === 'text') {
      for (const k of ['now_text', 'now_asof', 'now_source']) if (!r[k]) fail(`${k} is required when now_mode is text`);
      now = { figure: '', text: r.now_text, asOf: r.now_asof, kind: kind('now_kind'), source: { name: r.now_source, url: https('now_url') } };
    } else {
      now = fail('now_mode must be indicator, target_level or text');
    }

    const outlook = r.outlook
      ? { text: r.outlook, kind: kind('outlook_kind'), source: { name: r.outlook_source || fail('outlook_source is required with an outlook'), url: https('outlook_url') } }
      : null;

    return {
      id: r.id,
      order: Number(r.order),
      group,
      area: r.area,
      promise: r.promise,
      who: r.who,
      made: Number(r.made),
      deadline,
      promised: r.promised,
      now,
      progress,
      result: (r.result || null) as PromiseResult | null,
      outlook,
      source: { name: r.promise_source, url: https('promise_url') },
      note: r.note ?? '',
      checked: r.checked,
    };
  });
  return out.sort((a, b) => a.order - b.order);
}
