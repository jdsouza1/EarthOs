'use client';

import { useState, type ReactNode } from 'react';
import { Grid3x3, List, Users } from 'lucide-react';

const ICONS = { list: List, matrix: Grid3x3, countries: Users } as const;

export interface View {
  key: string;
  label: string;
  icon: keyof typeof ICONS;
  content: ReactNode;
}

/** Switches between several views of the same content. All views are rendered on the server. */
export function ViewToggle({ views, label }: { views: View[]; label: string }) {
  const [active, setActive] = useState(views[0]?.key);
  return (
    <div>
      <div role="group" aria-label={`${label} view`} className="tag mb-3 inline-flex gap-0.5 rounded border border-line-strong p-0.5 text-[10px]">
        {views.map((v) => {
          const Icon = ICONS[v.icon];
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => setActive(v.key)}
              aria-pressed={active === v.key}
              className={`flex items-center gap-1 rounded px-2 py-1 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                active === v.key ? 'bg-accent-bg/60 text-accent-strong' : 'text-subtle hover:text-ink-2'
              }`}
            >
              <Icon size={12} aria-hidden="true" /> {v.label}
            </button>
          );
        })}
      </div>
      {views.map((v) => (
        <div key={v.key} hidden={active !== v.key}>
          {v.content}
        </div>
      ))}
    </div>
  );
}
