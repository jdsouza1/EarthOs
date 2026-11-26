import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

/**
 * Several ways to rank the same list of problems (data/priority_*.csv). Each lens is one published
 * source's figure; EarthOS adds no ranking of its own. A lens that has no figure for a problem says
 * so and gives the reason, instead of guessing. Two checks are computed for every lens:
 * coverage (how many of the problems it can rank) and stability (how many of its pairwise orderings
 * survive a change in the figures of the size stated on the lens).
 */
export type Kind = 'measured' | 'modelled' | 'expert';
export const KIND_LABEL: Record<Kind, string> = { measured: 'Measured', modelled: 'Modelled', expert: 'Expert judgement' };

export interface Problem {
  id: string;
  name: string;
  href: string | null;
}

export interface Entry {
  problemId: string;
  /** Position inside this lens; equal figures share a position. */
  rank: number;
  tied: boolean;
  /** 1 for the top of the lens, 0 for the bottom; equal figures share the average. Used only for the reader's weights. */
  score: number;
  display: string;
  detail: string;
  year: string;
  kind: Kind;
  source: { name: string; url: string };
}

export interface Lens {
  id: string;
  name: string;
  question: string;
  /** Null when rows come from several sources (each row then names its own). */
  source: { name: string; url: string } | null;
  asOf: string;
  caveat: string;
  checked: string;
  ranked: Entry[];
  unranked: { problemId: string; note: string }[];
  kinds: Kind[];
  /** Null when the source publishes positions only, so there are no figures to vary. */
  stability: { stable: number; pairs: number; rule: string } | null;
  /** False when the lens ranks too few problems for "top three" to mean anything. */
  inAgreement: boolean;
}

/** A lens must rank at least this many problems before its top three counts towards agreement. */
export const AGREEMENT_MIN = 5;

export interface Priorities {
  problems: Problem[];
  lenses: Lens[];
  /** For each problem: how many of the lenses that count towards agreement rank it, and in how many it is in the top three. */
  agreement: Record<string, { rankedBy: number; top3: number }>;
}

async function read(file: string) {
  return parseCsv(await readFile(path.join(process.cwd(), 'data', file), 'utf8'));
}

export async function getPriorities(): Promise<Priorities> {
  const problems: Problem[] = (await read('priority_problems.csv'))
    .map((r, i) => {
      if (!r.id || !r.name || !/^\d+$/.test(r.order ?? '')) throw new Error(`data/priority_problems.csv line ${i + 2}: id, order and name are required`);
      if (r.href && !r.href.startsWith('/')) throw new Error(`data/priority_problems.csv line ${i + 2}: href must be a site path`);
      return { id: r.id, name: r.name, href: r.href || null, order: Number(r.order) };
    })
    .sort((a, b) => a.order - b.order)
    .map((p) => ({ id: p.id, name: p.name, href: p.href }));
  const ids = new Set(problems.map((p) => p.id));
  if (ids.size !== problems.length) throw new Error('data/priority_problems.csv: duplicate id');

  const scoreRows = await read('priority_scores.csv');
  const lensRows = (await read('priority_lenses.csv')).sort((a, b) => Number(a.order) - Number(b.order));

  const lenses: Lens[] = lensRows.map((l, li) => {
    const lfail = (m: string): never => {
      throw new Error(`data/priority_lenses.csv line ${li + 2}: ${m}`);
    };
    for (const k of ['id', 'name', 'question', 'source', 'asof', 'caveat']) if (!l[k]) lfail(`${k} is required`);
    if (l.direction !== 'high' && l.direction !== 'low') lfail('direction must be high or low');
    if (l.source_url && !/^https:\/\//.test(l.source_url)) lfail('source_url must be an https link');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(l.checked ?? '')) lfail('checked must be a date');
    const wobble = l.wobble ? Number(l.wobble) : null;
    if (wobble !== null && !(wobble > 1)) lfail('wobble must be a number above 1, or empty');

    const mine = scoreRows.map((r, i) => ({ r, line: i + 2 })).filter(({ r }) => r.lens_id === l.id);
    const seen = new Set<string>();
    const raw: { value: number; e: Omit<Entry, 'rank' | 'tied' | 'score'> }[] = [];
    const unranked: Lens['unranked'] = [];
    for (const { r, line } of mine) {
      const fail = (m: string): never => {
        throw new Error(`data/priority_scores.csv line ${line}: ${m}`);
      };
      if (!ids.has(r.problem_id)) fail(`unknown problem ${r.problem_id}`);
      if (seen.has(r.problem_id)) fail(`${r.problem_id} appears twice in lens ${l.id}`);
      seen.add(r.problem_id);
      if (!r.value) {
        if (!r.note) fail('a row with no figure must say why in note');
        unranked.push({ problemId: r.problem_id, note: r.note });
        continue;
      }
      const value = Number(r.value);
      if (!Number.isFinite(value) || value <= 0) fail('value must be a positive number');
      for (const k of ['display', 'detail', 'year', 'source']) if (!r[k]) fail(`${k} is required when there is a figure`);
      if (!(r.kind in KIND_LABEL)) fail('kind must be measured, modelled or expert');
      if (!/^https:\/\//.test(r.source_url ?? '')) fail('source_url must be an https link');
      raw.push({
        value,
        e: { problemId: r.problem_id, display: r.display, detail: r.detail, year: r.year, kind: r.kind as Kind, source: { name: r.source, url: r.source_url } },
      });
    }
    for (const id of ids) if (!seen.has(id)) lfail(`no row for problem ${id}; every lens must list every problem, with a note where it has no figure`);
    if (!raw.length) lfail('a lens must rank at least one problem');

    const better = (a: number, b: number) => (l.direction === 'high' ? a > b : a < b);
    raw.sort((a, b) => (a.value === b.value ? 0 : better(a.value, b.value) ? -1 : 1));
    const n = raw.length;
    const ranked: Entry[] = raw.map(({ value, e }) => {
      const ahead = raw.filter((o) => better(o.value, value)).length;
      const same = raw.filter((o) => o.value === value).length;
      const avgRank = ahead + (same + 1) / 2;
      return { ...e, rank: ahead + 1, tied: same > 1, score: n === 1 ? 1 : (n - avgRank) / (n - 1) };
    });

    let stability: Lens['stability'] = null;
    if (wobble !== null) {
      let pairs = 0;
      let stable = 0;
      for (let a = 0; a < n; a++)
        for (let b = a + 1; b < n; b++) {
          pairs++;
          const [hi, lo] = raw[a].value > raw[b].value ? [raw[a].value, raw[b].value] : [raw[b].value, raw[a].value];
          // The order holds only if the larger figure, pushed down, still beats the smaller one, pushed up.
          // A range the source states itself is a multiple (3 times higher or lower); the default is a percentage either way.
          if (l.wobble_note ? hi / wobble > lo * wobble : hi * (2 - wobble) > lo * wobble) stable++;
        }
      stability = { stable, pairs, rule: l.wobble_note || `Each figure moved up or down by ${Math.round((wobble - 1) * 100)}%.` };
    }

    return {
      id: l.id,
      name: l.name,
      question: l.question,
      source: l.source_url ? { name: l.source, url: l.source_url } : null,
      asOf: l.asof,
      caveat: l.caveat,
      checked: l.checked,
      ranked,
      unranked,
      kinds: [...new Set(ranked.map((e) => e.kind))],
      stability,
      inAgreement: ranked.length >= AGREEMENT_MIN,
    };
  });
  if (new Set(lenses.map((l) => l.id)).size !== lenses.length) throw new Error('data/priority_lenses.csv: duplicate id');
  for (const r of scoreRows) if (!lenses.some((l) => l.id === r.lens_id)) throw new Error(`data/priority_scores.csv: unknown lens ${r.lens_id}`);

  const agreement: Priorities['agreement'] = {};
  for (const p of problems) {
    const hits = lenses.filter((l) => l.inAgreement).map((l) => l.ranked.find((e) => e.problemId === p.id)).filter((e): e is Entry => !!e);
    agreement[p.id] = { rankedBy: hits.length, top3: hits.filter((e) => e.rank <= 3).length };
  }
  return { problems, lenses, agreement };
}
