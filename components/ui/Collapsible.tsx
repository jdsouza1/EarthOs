'use client';

import { useState, type ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';

/** A panel with a header row and a +/- button that shows or hides its body. */
export function Collapsible({
  id,
  label,
  header,
  children,
  defaultOpen = true,
}: {
  id: string;
  label: string;
  header: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="panel p-5">
      <div className="flex items-center gap-1.5">
        {header}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={id}
          aria-label={`${open ? 'Minimise' : 'Open'} ${label}`}
          title={open ? 'Minimise' : 'Open'}
          className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded border border-line-strong text-subtle hover:border-accent-line hover:text-ink-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          {open ? <Minus size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
        </button>
      </div>
      <div id={id} hidden={!open} className="mt-1">
        {children}
      </div>
    </section>
  );
}
