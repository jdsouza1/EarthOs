import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from './csv';

/**
 * Published tests of methods that claim to spot trouble early (data/history_tests.csv).
 * EarthOS runs no test of its own here: each row reports someone else's published test.
 * The rules from the Deep Time design are enforced below; a row that breaks one stops the build.
 */
export type TestKind = 'real_future' | 'held_back' | 'past_only';
export type TestedBy = 'authors' | 'independent';
export type TestResult = 'supported' | 'mixed' | 'too_early';

export const TEST_LABEL: Record<TestKind, string> = {
  real_future: 'Tested on the real future',
  held_back: 'Tested on held-back data',
  past_only: 'Tested only on the past',
};
export const TEST_MEANING: Record<TestKind, string> = {
  real_future: 'The claim was published before the events it was checked against. The strongest test.',
  held_back: 'Built on some years or places and checked on others it had not seen.',
  past_only: 'Checked against the same history it was built from. The weakest test: a method can fit the past and still fail.',
};
export const TESTED_BY_LABEL: Record<TestedBy, string> = { authors: 'Checked by the authors', independent: 'Checked independently' };
export const RESULT_LABEL: Record<TestResult, string> = {
  supported: 'Testers report it held up',
  mixed: 'Held up, then weakened',
  too_early: 'Too early to tell',
};
export const TEST_ORDER: TestKind[] = ['real_future', 'held_back', 'past_only'];

export interface HistoryTest {
  id: string;
  order: number;
  topic: string;
  title: string;
  claim: string;
  who: string;
  published: number;
  test: TestKind;
  testYear: number;
  testedBy: TestedBy;
  result: TestResult;
  finding: string;
  laterCheck: string;
  note: string;
  claimSource: { name: string; url: string };
  testSource: { name: string; url: string };
  laterSource: { name: string; url: string } | null;
  checked: string;
}

const FILE = 'history_tests.csv';

export async function getHistoryTests(): Promise<HistoryTest[]> {
  const text = await readFile(path.join(process.cwd(), 'data', FILE), 'utf8');
  const seen = new Set<string>();
  return parseCsv(text)
    .map((r, i) => {
      const fail = (msg: string): never => {
        throw new Error(`data/${FILE} line ${i + 2} (${r.id || 'no id'}): ${msg}`);
      };
      if (!r.id || seen.has(r.id)) fail('id is missing or repeated');
      seen.add(r.id);
      if (!(r.test in TEST_LABEL)) fail(`test must be one of ${Object.keys(TEST_LABEL).join(', ')}`);
      if (!(r.tested_by in TESTED_BY_LABEL)) fail('tested_by must be authors or independent');
      if (!(r.result in RESULT_LABEL)) fail(`result must be one of ${Object.keys(RESULT_LABEL).join(', ')}`);
      for (const k of ['topic', 'title', 'claim', 'who', 'finding', 'claim_source', 'test_source'] as const) if (!r[k]) fail(`${k} is empty`);
      for (const k of ['claim_url', 'test_url'] as const) if (!/^https:\/\//.test(r[k] ?? '')) fail(`${k} must be an https link`);
      const hasLater = Boolean(r.later_url || r.later_source);
      if (hasLater && (!r.later_source || !/^https:\/\//.test(r.later_url ?? ''))) fail('later_source and later_url go together, as an https link');
      if (r.later_check && !hasLater) fail('later_check needs a later_source');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checked)) fail('checked must be YYYY-MM-DD');
      const published = Number(r.published);
      const testYear = Number(r.test_year);
      if (!Number.isInteger(published) || !Number.isInteger(testYear)) fail('published and test_year must be years');
      if (testYear < published) fail('test_year cannot be before published');
      // "Real future" means the claim was on record before the period it was checked against.
      if (r.test === 'real_future' && !(published < testYear)) fail('a real-future test must come after the claim was published');
      if (r.result === 'mixed' && !r.later_check) fail('a mixed result needs the later check that weakened it');
      return {
        id: r.id,
        order: Number(r.order) || i,
        topic: r.topic,
        title: r.title,
        claim: r.claim,
        who: r.who,
        published,
        test: r.test as TestKind,
        testYear,
        testedBy: r.tested_by as TestedBy,
        result: r.result as TestResult,
        finding: r.finding,
        laterCheck: r.later_check ?? '',
        note: r.note ?? '',
        claimSource: { name: r.claim_source, url: r.claim_url },
        testSource: { name: r.test_source, url: r.test_url },
        laterSource: hasLater ? { name: r.later_source, url: r.later_url } : null,
        checked: r.checked,
      };
    })
    .sort((a, b) => TEST_ORDER.indexOf(a.test) - TEST_ORDER.indexOf(b.test) || a.order - b.order);
}
