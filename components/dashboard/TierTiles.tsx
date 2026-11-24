import type { TierSnapshot } from '@/lib/types';
import { TIER_THEME } from './theme';

/** The four tier scores as large tiles. Each opens its group of measured indicators further down. */
export function TierTiles({ tiers }: { tiers: TierSnapshot[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {tiers.map((t) => {
        const theme = TIER_THEME[t.id];
        return (
          <a
            key={t.id}
            href={`#tier-${t.id}`}
            title={t.about}
            className="card flex flex-col gap-1.5 p-4 transition-colors hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className={`text-sm font-semibold ${theme.text}`}>{t.name}</span>
            <span className="flex items-baseline gap-2">
              <span className="font-mono text-4xl font-bold leading-none text-ink">{t.score}</span>
              <span className="text-sm text-subtle">{t.status}</span>
            </span>
            {t.range && (
              <span className="text-xs text-subtle">
                Range {t.range[0]}–{t.range[1]} under other scoring choices
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}
