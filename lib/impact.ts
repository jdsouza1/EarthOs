import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'policy_impact.csv';

export const IMPACT_BLOCKS = ['why', 'worst', 'survival', 'best', 'disagree', 'knockon', 'affected', 'timeline'] as const;
export type ImpactBlock = (typeof IMPACT_BLOCKS)[number];

/** measured = counted or recorded · modelled = output of a published model · expert = a named expert's or group's estimate */
export const CONFIDENCE = ['measured', 'modelled', 'expert'] as const;
export type Confidence = (typeof CONFIDENCE)[number];

export interface ImpactItem {
  topic: string;
  block: ImpactBlock;
  order: number;
  /** Date text, timeline rows only. */
  label: string;
  text: string;
  confidence: Confidence;
  sourceName: string;
  sourceUrl: string;
  /** ISO date (end date for ranges), timeline rows only. */
  dateIso: string;
}

/** Impact lines for one policy topic. Every line must name a source and carry a confidence label, or the build fails. */
export async function getImpact(topic: string): Promise<Record<ImpactBlock, ImpactItem[]>> {
  const empty = Object.fromEntries(IMPACT_BLOCKS.map((b) => [b, [] as ImpactItem[]])) as Record<ImpactBlock, ImpactItem[]>;
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return empty;
    throw e;
  }
  parseCsv(text).forEach((r, i) => {
    const line = i + 2;
    const fail = (msg: string): never => {
      throw new Error(`data/${FILE} line ${line}: ${msg}`);
    };
    if (r.topic !== topic) return;
    const block = r.block as ImpactBlock;
    if (!IMPACT_BLOCKS.includes(block)) fail(`block must be one of ${IMPACT_BLOCKS.join(', ')}`);
    const confidence = r.confidence as Confidence;
    if (!CONFIDENCE.includes(confidence)) fail(`confidence must be one of ${CONFIDENCE.join(', ')}`);
    const order = Number(r.order);
    if (!Number.isInteger(order) || order < 1) fail('order must be a whole number from 1');
    if (!r.text) fail('text is required');
    if (!r.source_name) fail('source_name is required: every impact line needs a named source');
    if (!/^https:\/\//.test(r.source_url ?? '')) fail('source_url must start with https://');
    if (block === 'timeline') {
      if (!r.label) fail('timeline rows need a label (the date as shown)');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date_iso ?? '')) fail('timeline rows need date_iso as YYYY-MM-DD');
    }
    empty[block].push({
      topic,
      block,
      order,
      label: r.label ?? '',
      text: r.text,
      confidence,
      sourceName: r.source_name,
      sourceUrl: r.source_url,
      dateIso: r.date_iso ?? '',
    });
  });
  for (const b of IMPACT_BLOCKS) {
    empty[b].sort((x, y) => (b === 'timeline' ? x.dateIso.localeCompare(y.dateIso) : x.order - y.order));
  }
  return empty;
}
