import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'whatif.csv';

export interface WhatIfState {
  state: string;
  isBaseline: boolean;
  value: string;
  /** For °C cards: the number drawn against the 1.5 °C limit. */
  valueNum: number | null;
  unit: string;
  reason: string;
}

export interface WhatIf {
  id: string;
  topic: string;
  question: string;
  metric: string;
  period: string;
  who: string;
  whoHref: string;
  sourceName: string;
  sourceUrl: string;
  published: string;
  note: string;
  states: WhatIfState[];
}

/**
 * What-if toggles from data/whatif.csv. EarthOS simulates nothing: each toggle only switches between
 * scenarios that ONE named body published from ONE model. Rows that break that rule fail the build.
 */
export async function getWhatIfs(): Promise<WhatIf[]> {
  const text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  const rows = parseCsv(text);
  const byId = new Map<string, WhatIf>();
  rows.forEach((r, i) => {
    const fail = (msg: string): never => {
      throw new Error(`data/${FILE} line ${i + 2}: ${msg}`);
    };
    for (const col of ['toggle_id', 'question', 'metric', 'state', 'value', 'reason', 'who', 'source_name', 'source_url'])
      if (!r[col]) fail(`${col} is required`);
    if (!/^https:\/\//.test(r.source_url)) fail('source_url must be https');
    if (r.confidence !== 'modelled') fail('confidence must be "modelled": these are published model scenarios');
    if (!/^\d{4}(-\d{2})?$/.test(r.published)) fail('published must be YYYY or YYYY-MM');
    if (r.is_baseline !== 'true' && r.is_baseline !== 'false') fail('is_baseline must be true or false');
    const num = r.value_num === '' ? null : Number(r.value_num);
    if (num !== null && !Number.isFinite(num)) fail(`value_num "${r.value_num}" is not a number`);
    let t = byId.get(r.toggle_id);
    if (!t) {
      t = {
        id: r.toggle_id,
        topic: r.topic,
        question: r.question,
        metric: r.metric,
        period: r.period,
        who: r.who,
        whoHref: r.who_href || '/levers',
        sourceName: r.source_name,
        sourceUrl: r.source_url,
        published: r.published,
        note: r.note,
        states: [],
      };
      byId.set(r.toggle_id, t);
    } else if (t.sourceUrl !== r.source_url) {
      fail(`every state of "${r.toggle_id}" must come from the same source: scenarios from different models are never mixed`);
    }
    t.states.push({ state: r.state, isBaseline: r.is_baseline === 'true', value: r.value, valueNum: num, unit: r.unit, reason: r.reason });
  });
  for (const t of byId.values()) {
    const bases = t.states.filter((s) => s.isBaseline).length;
    if (bases !== 1) throw new Error(`data/${FILE}: "${t.id}" needs exactly one baseline state (has ${bases})`);
    t.states.sort((a, b) => Number(b.isBaseline) - Number(a.isBaseline));
  }
  return [...byId.values()];
}
