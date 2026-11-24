import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';
import { CONFIDENCE, type Confidence } from './impact';

const FILE = 'policy_keynumbers.csv';

export interface KeyNumber {
  order: number;
  label: string;
  value: string;
  context: string;
  confidence: Confidence;
  sourceName: string;
  sourceUrl: string;
}

/** Headline numbers for one policy topic. Every number must name a source and carry a confidence label, or the build fails. */
export async function getKeyNumbers(topic: string): Promise<KeyNumber[]> {
  const text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  const out: KeyNumber[] = [];
  parseCsv(text).forEach((r, i) => {
    const fail = (msg: string): never => {
      throw new Error(`data/${FILE} line ${i + 2}: ${msg}`);
    };
    if (r.topic !== topic) return;
    const confidence = r.confidence as Confidence;
    if (!CONFIDENCE.includes(confidence)) fail(`confidence must be one of ${CONFIDENCE.join(', ')}`);
    const order = Number(r.order);
    if (!Number.isInteger(order) || order < 1) fail('order must be a whole number from 1');
    if (!r.label || !r.value) fail('label and value are required');
    if (!r.source_name) fail('source_name is required: every key number needs a named source');
    if (!/^https:\/\//.test(r.source_url ?? '')) fail('source_url must start with https://');
    out.push({ order, label: r.label, value: r.value, context: r.context ?? '', confidence, sourceName: r.source_name, sourceUrl: r.source_url });
  });
  return out.sort((a, b) => a.order - b.order);
}
