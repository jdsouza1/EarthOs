'use client';

import { useEffect, useState } from 'react';
import type { Indicator } from '@/lib/indicators';
import { IndicatorCard } from './IndicatorCard';
import { TIER_THEME } from './theme';

type TierId = Indicator['tierId'];

/**
 * The indicator cards with a filter by area. The four area tiles at the top of the dashboard link to
 * #tier-<id>; arriving on such a link selects that area here, and "All" clears it again.
 */
export function IndicatorGroups({ groups }: { groups: { id: TierId; name: string; items: Indicator[] }[] }) {
  const [sel, setSel] = useState<TierId | null>(null);
  const total = groups.reduce((n, g) => n + g.items.length, 0);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace(/^#tier-/, '');
      const g = groups.find((x) => x.id === id);
      if (g) setSel(g.id);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [groups]);

  const pick = (id: TierId | null) => {
    setSel(id);
    // Drop a #tier- link from the address so tapping the same area tile again selects it again.
    if (window.location.hash.startsWith('#tier-')) window.history.replaceState(null, '', window.location.pathname);
  };
  const pill = (on: boolean) =>
    `min-h-9 whitespace-nowrap rounded-full border px-3 py-1 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
      on ? 'border-accent bg-accent-bg font-semibold text-ink' : 'border-line-strong text-muted hover:border-accent hover:text-ink'
    }`;

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-5 mb-3 border-b border-line bg-surface px-5 py-2">
        <div role="group" aria-label="Show indicators for one area" className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button type="button" aria-pressed={sel === null} onClick={() => pick(null)} className={pill(sel === null)}>
            All ({total})
          </button>
          {groups.map((g) => (
            <button key={g.id} type="button" aria-pressed={sel === g.id} onClick={() => pick(g.id)} className={pill(sel === g.id)}>
              {g.name} ({g.items.length})
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        {groups
          .filter((g) => sel === null || g.id === sel)
          .map((g) => (
            <div key={g.id} id={`tier-${g.id}`} className="scroll-mt-24">
              <h3 className={`eyebrow mb-2 ${TIER_THEME[g.id].text}`}>{g.name}</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {g.items.map((ind) => (
                  <IndicatorCard key={ind.id} ind={ind} />
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
