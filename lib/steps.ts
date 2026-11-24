import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';
import { CONFIDENCE, type Confidence } from './impact';
import { getMasterPlan } from './policies';

const FILE = 'policy_steps.csv';

/** what = plain-language explanation · do = concrete steps to achieve it */
export const STEP_BLOCKS = ['what', 'do'] as const;
export type StepBlock = (typeof STEP_BLOCKS)[number];

export interface StepItem {
  block: StepBlock;
  order: number;
  text: string;
  confidence: Confidence;
  sourceName: string;
  sourceUrl: string;
}

/** Detail for each master-gameplan step, keyed by theme. Every line needs a source and a confidence label or the build fails. */
export async function getStepDetails(topic = 'climate'): Promise<Map<string, StepItem[]>> {
  const out = new Map<string, StepItem[]>();
  let text: string;
  try {
    text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return out;
    throw e;
  }
  const themes = new Set((await getMasterPlan(topic)).map((m) => m.theme));
  parseCsv(text).forEach((r, i) => {
    const fail = (msg: string): never => {
      throw new Error(`data/${FILE} line ${i + 2}: ${msg}`);
    };
    if (r.topic !== topic) return;
    if (!themes.has(r.theme)) fail(`unknown theme "${r.theme}" (add it to policy_master.csv)`);
    const block = r.block as StepBlock;
    if (!STEP_BLOCKS.includes(block)) fail(`block must be one of ${STEP_BLOCKS.join(', ')}`);
    const confidence = r.confidence as Confidence;
    if (!CONFIDENCE.includes(confidence)) fail(`confidence must be one of ${CONFIDENCE.join(', ')}`);
    const order = Number(r.order);
    if (!Number.isInteger(order) || order < 1) fail('order must be a whole number from 1');
    if (!r.text) fail('text is required');
    if (!r.source_name) fail('source_name is required');
    if (!/^https:\/\//.test(r.source_url ?? '')) fail('source_url must start with https://');
    out.set(r.theme, [...(out.get(r.theme) ?? []), { block, order, text: r.text, confidence, sourceName: r.source_name, sourceUrl: r.source_url }]);
  });
  for (const items of out.values()) items.sort((a, b) => a.order - b.order);
  return out;
}
