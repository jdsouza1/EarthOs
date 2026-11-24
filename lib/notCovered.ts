import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

const FILE = 'not_covered.csv';

/**
 * Areas EarthOS does not cover in depth yet (data/not_covered.csv): one sourced headline number and one
 * sourced line on where things stand. They are not scored and feed no other page. When an area gets a
 * deep dive, its row is removed here and the area moves to its real home.
 */
export type CoverKind = 'measured' | 'modelled' | 'expert';
export const COVER_KIND_LABEL: Record<CoverKind, string> = { measured: 'Measured', modelled: 'Modelled', expert: 'Expert judgement' };

export interface UncoveredArea {
  id: string;
  order: number;
  title: string;
  why: string;
  figure: string;
  figureText: string;
  kind: CoverKind;
  year: number;
  source: { name: string; url: string };
  status: string;
  statusSource: { name: string; url: string };
  checked: string;
}

export async function getNotCovered(): Promise<UncoveredArea[]> {
  const text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  const seen = new Set<string>();
  const out = parseCsv(text).map((r, i) => {
    const fail = (m: string): never => {
      throw new Error(`data/${FILE} line ${i + 2}: ${m}`);
    };
    for (const k of ['id', 'title', 'why', 'figure', 'figure_text', 'source', 'status', 'status_source']) if (!r[k]) fail(`${k} is required`);
    if (seen.has(r.id)) fail(`duplicate id ${r.id}`);
    seen.add(r.id);
    if (!(r.kind in COVER_KIND_LABEL)) fail('kind must be measured, modelled or expert');
    for (const k of ['source_url', 'status_url']) if (!/^https:\/\//.test(r[k] ?? '')) fail(`${k} must be an https link`);
    if (!/^\d{4}$/.test(r.year ?? '')) fail('year must be a year');
    if (!/^\d+$/.test(r.order ?? '')) fail('order must be a number');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked ?? '')) fail('checked must be YYYY-MM-DD');
    return {
      id: r.id,
      order: Number(r.order),
      title: r.title,
      why: r.why,
      figure: r.figure,
      figureText: r.figure_text,
      kind: r.kind as CoverKind,
      year: Number(r.year),
      source: { name: r.source, url: r.source_url },
      status: r.status,
      statusSource: { name: r.status_source, url: r.status_url },
      checked: r.checked,
    };
  });
  return out.sort((a, b) => a.order - b.order);
}
