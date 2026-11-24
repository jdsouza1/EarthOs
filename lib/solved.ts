import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'solved.csv';
export const STATUSES = ['solved', 'on track', 'nearly there', 'unfinished'] as const;
export type Status = (typeof STATUSES)[number];
/** Kinds of cooperation, after Scott Barrett (Why Cooperate?, 2007). Empty = not classified. */
export const KINDS = ['', 'one', 'everyone', 'total'] as const;
export type Kind = (typeof KINDS)[number];

export interface Solved {
  id: string;
  problem: string;
  status: Status;
  headline: string;
  detail: string;
  how: string;
  kind: Kind;
  years: string;
  sourceName: string;
  sourceUrl: string;
  published: string;
  confidence: string;
}

/** Past global problems and how they were tackled, from data/solved.csv. Bad rows fail the build. */
export async function getSolved(): Promise<Solved[]> {
  const rows = parseCsv(await readFile(path.join(process.cwd(), 'data', FILE), 'utf8'));
  return rows
    .map((r, i) => {
      const fail = (msg: string): never => {
        throw new Error(`data/${FILE} line ${i + 2}: ${msg}`);
      };
      for (const c of ['id', 'problem', 'headline', 'detail', 'how', 'source_name']) if (!r[c]) fail(`${c} is required`);
      if (!/^https:\/\//.test(r.source_url)) fail('source_url must be https');
      if (!(STATUSES as readonly string[]).includes(r.status)) fail(`status must be one of ${STATUSES.join(', ')}`);
      if (!(KINDS as readonly string[]).includes(r.kind)) fail('kind must be empty, one, everyone or total');
      if (!['measured', 'modelled', 'expert'].includes(r.confidence)) fail('confidence must be measured, modelled or expert');
      return {
        order: Number(r.order),
        id: r.id,
        problem: r.problem,
        status: r.status as Status,
        headline: r.headline,
        detail: r.detail,
        how: r.how,
        kind: r.kind as Kind,
        years: r.years,
        sourceName: r.source_name,
        sourceUrl: r.source_url,
        published: r.published,
        confidence: r.confidence,
      };
    })
    .sort((a, b) => a.order - b.order)
    .map(({ order: _o, ...rest }) => rest);
}
