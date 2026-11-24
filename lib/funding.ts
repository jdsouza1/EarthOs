import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';
import type { TierId } from './types';
import { AREA_LABEL } from './trackRecord';
import { loadIndicatorSeries } from './indicators';

/**
 * The Funding page (data/funding.csv, data/funding_benchmarks.csv): for each area, what is spent and what
 * published sources say is needed. Rules from the Funding design, enforced here:
 *  - every figure carries a kind label and an https source;
 *  - the gap is never typed in: it is worked out from the two figures, or is the "extra needed" figure itself;
 *  - areas are never added together (no total is exported from this module).
 */
export type Block = 'capital' | 'policy' | 'tech';
export type FigureKind = 'measured' | 'modelled' | 'expert' | 'pledged' | 'target';
export const BLOCK_LABEL: Record<Block, string> = { capital: 'Capital', policy: 'Policy and governance', tech: 'Tech and R&D' };
export const KIND_LABEL: Record<FigureKind, string> = {
  measured: 'Measured',
  modelled: 'Modelled',
  expert: 'Expert',
  pledged: 'Pledged',
  target: "Funder's target",
};

export interface Figure {
  low: number;
  high: number;
  year: number;
  kind: FigureKind;
  text: string;
  sources: { name: string; url: string }[];
}
export interface FundingArea {
  id: string;
  order: number;
  title: string;
  tier: TierId;
  tierLabel: string;
  indicatorId: string;
  blocks: Block[];
  blocksWhy: string;
  period: 'year' | 'five_years';
  spent: Figure | null;
  need: (Figure & { isExtra: boolean }) | null;
  needText: string;
  /** US$ billions; null when there is no published need. */
  gap: { low: number; high: number } | null;
  covers: string;
  outcome: { text: string; source: { name: string; url: string } } | null;
  note: string;
  checked: string;
}
export interface Benchmark {
  id: string;
  title: string;
  valueB: number;
  year: number;
  text: string;
  source: { name: string; url: string };
  note: string;
}

const read = (f: string) => readFile(path.join(process.cwd(), 'data', f), 'utf8');
const https = (u: string | undefined) => /^https:\/\//.test(u ?? '');

export async function getFunding(): Promise<FundingArea[]> {
  const [text, series] = await Promise.all([read('funding.csv'), loadIndicatorSeries()]);
  const seen = new Set<string>();
  return parseCsv(text)
    .map((r, i) => {
      const fail = (m: string): never => {
        throw new Error(`data/funding.csv line ${i + 2} (${r.id || 'no id'}): ${m}`);
      };
      if (!r.id || seen.has(r.id)) fail('id is missing or repeated');
      seen.add(r.id);
      if (!(r.tier in AREA_LABEL)) fail('unknown tier');
      if (!series.has(r.indicator_id)) fail(`indicator_id "${r.indicator_id}" is not in data/indicators.csv`);
      const blocks = (r.blocks ?? '').split('|').filter(Boolean) as Block[];
      if (blocks.length === 0 || blocks.some((b) => !(b in BLOCK_LABEL))) fail('blocks must be capital, policy and/or tech');
      if (r.period !== 'year' && r.period !== 'five_years') fail('period must be year or five_years');
      for (const k of ['title', 'blocks_why', 'covers', 'need_text'] as const) if (!r[k]) fail(`${k} is empty`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked)) fail('checked must be YYYY-MM-DD');

      const figure = (p: 'spent' | 'need'): Figure | null => {
        if (r[`${p}_low`] === '' && r[`${p}_high`] === '') return null;
        const low = Number(r[`${p}_low`]);
        const high = Number(r[`${p}_high`]);
        const year = Number(r[`${p}_year`]);
        const kind = r[`${p}_kind`] as FigureKind;
        if (!(low >= 0 && high >= low)) fail(`${p}_low and ${p}_high must be numbers, low first`);
        if (!Number.isInteger(year)) fail(`${p}_year must be a year`);
        if (!(kind in KIND_LABEL)) fail(`${p}_kind must be one of ${Object.keys(KIND_LABEL).join(', ')}`);
        const sources = [{ name: r[`${p}_source`], url: r[`${p}_url`] }];
        if (p === 'need' && r.need_source_2) sources.push({ name: r.need_source_2, url: r.need_url_2 });
        if (sources.some((s) => !s.name || !https(s.url))) fail(`${p} needs a named source with an https link`);
        if (!r[`${p}_text`]) fail(`${p}_text is empty`);
        return { low, high, year, kind, text: r[`${p}_text`], sources };
      };
      const spent = figure('spent');
      const needFig = figure('need');
      const need = needFig ? { ...needFig, isExtra: r.need_is_extra === 'true' } : null;
      if (need && !need.isExtra && !spent) fail('a total need must have a spent figure to measure the gap against');
      const gap = !need
        ? null
        : need.isExtra
          ? { low: need.low, high: need.high }
          : { low: Math.max(0, need.low - spent!.high), high: Math.max(0, need.high - spent!.low) };

      const outcome = r.outcome ? { text: r.outcome, source: { name: r.outcome_source, url: r.outcome_url } } : null;
      if (outcome && (!outcome.source.name || !https(outcome.source.url))) fail('outcome needs a named source with an https link');

      return {
        id: r.id,
        order: Number(r.order) || i,
        title: r.title,
        tier: r.tier as TierId,
        tierLabel: AREA_LABEL[r.tier as TierId],
        indicatorId: r.indicator_id,
        blocks,
        blocksWhy: r.blocks_why,
        period: r.period as FundingArea['period'],
        spent,
        need,
        needText: r.need_text,
        gap,
        covers: r.covers,
        outcome,
        note: r.note ?? '',
        checked: r.checked,
      };
    })
    .sort((a, b) => a.order - b.order);
}

export async function getBenchmarks(): Promise<Benchmark[]> {
  return parseCsv(await read('funding_benchmarks.csv'))
    .map((r, i) => {
      const fail = (m: string): never => {
        throw new Error(`data/funding_benchmarks.csv line ${i + 2}: ${m}`);
      };
      const valueB = Number(r.value_b);
      if (!r.id || !r.title || !r.text || !r.source || !https(r.source_url)) fail('id, title, text and an https source are required');
      if (!(valueB > 0) || !Number.isInteger(Number(r.year))) fail('value_b and year must be numbers');
      return { order: Number(r.order) || i, id: r.id, title: r.title, valueB, year: Number(r.year), text: r.text, source: { name: r.source, url: r.source_url }, note: r.note ?? '' };
    })
    .sort((a, b) => a.order - b.order)
    .map(({ order: _o, ...b }) => b);
}

/** "$2.3 trillion", "$351 billion", "$300 million". */
export function money(b: number): string {
  if (b >= 1000) return `$${(b / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} trillion`;
  if (b >= 1) return `$${b.toLocaleString('en-US', { maximumFractionDigits: 1 })} billion`;
  return `$${Math.round(b * 1000).toLocaleString('en-US')} million`;
}
export function moneyRange(low: number, high: number): string {
  if (low === high) return money(low);
  const [a, b] = [money(low), money(high)];
  const unit = (s: string) => s.split(' ')[1];
  return unit(a) === unit(b) ? `${a.split(' ')[0]} to ${b}` : `${a} to ${b}`;
}
