'use client';

import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { POLICY_TOPICS } from '@/lib/policyTopics';

/** A standard "Topic" dropdown (native select), so it looks and works like the dropdowns people already know. */
export function TopicSelect({ current }: { current: string }) {
  const router = useRouter();
  const topics = POLICY_TOPICS.filter((t) => t.href);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="topic-select" className="text-sm font-semibold text-ink">
        Choose a topic <span className="font-normal text-muted">({topics.length} available)</span>
      </label>
      <div className="relative w-full max-w-sm">
        <select
          id="topic-select"
          value={current}
          onChange={(e) => {
            const t = topics.find((x) => x.id === e.target.value);
            if (t?.href) router.push(t.href);
          }}
          className="h-12 w-full cursor-pointer appearance-none rounded-xl border-2 border-accent bg-accent-bg pl-4 pr-12 text-base font-semibold text-ink shadow-sm transition-colors hover:bg-accent-line focus:outline-none focus-visible:ring-4 focus-visible:ring-accent-line"
        >
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <span aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-accent text-canvas">
          <ChevronDown size={18} />
        </span>
      </div>
      <p className="text-xs text-muted">{topics.map((t) => t.label).join(' · ')}</p>
    </div>
  );
}
