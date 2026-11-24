'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const century = (y: number) => Math.floor((y - 1) / 100) + 1;
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`;

/**
 * Century, then year, then month. Lists only issues that exist (data/briefs). Picking a month opens that issue;
 * the newest one is the live Brief at /report.
 */
export function BriefPicker({ issues, current, latest }: { issues: string[]; current: string; latest: string }) {
  const router = useRouter();
  const parsed = issues.map((k) => ({ key: k, year: Number(k.slice(0, 4)), month: Number(k.slice(5, 7)) }));
  const cur = parsed.find((p) => p.key === current) ?? parsed[0];
  const [c, setC] = useState(cur ? century(cur.year) : 0);
  const [y, setY] = useState(cur?.year ?? 0);
  if (parsed.length === 0) return null;

  const centuries = [...new Set(parsed.map((p) => century(p.year)))].sort((a, b) => b - a);
  const years = [...new Set(parsed.filter((p) => century(p.year) === c).map((p) => p.year))].sort((a, b) => b - a);
  const months = parsed.filter((p) => p.year === y).sort((a, b) => b.month - a.month);
  const go = (key: string) => router.push(key === latest ? '/report' : `/report/${key}`);
  const select = 'rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  return (
    <div className="flex flex-wrap items-end gap-2" role="group" aria-label="Choose an issue of the Brief">
      <label className="flex flex-col gap-1 text-xs text-subtle">
        Century
        <select
          className={select}
          value={c}
          onChange={(e) => {
            const nc = Number(e.target.value);
            setC(nc);
            const ny = Math.max(...parsed.filter((p) => century(p.year) === nc).map((p) => p.year));
            setY(ny);
          }}
        >
          {centuries.map((n) => (
            <option key={n} value={n}>
              {ordinal(n)} century
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-subtle">
        Year
        <select className={select} value={y} onChange={(e) => setY(Number(e.target.value))}>
          {years.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-subtle">
        Issue
        <select className={select} value={months.some((m) => m.key === current) ? current : ''} onChange={(e) => e.target.value && go(e.target.value)}>
          {!months.some((m) => m.key === current) && <option value="">Pick a month</option>}
          {months.map((m) => (
            <option key={m.key} value={m.key}>
              {MONTHS[m.month - 1]}
              {m.key === latest ? ' (latest)' : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
