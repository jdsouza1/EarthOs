import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Small ⓘ button that reveals a plain-English note on hover, tap or keyboard focus.
 * Pure CSS (no state), so it works in server and client components alike.
 */
export function InfoTip({
  id,
  label,
  children,
  align = 'center',
  size = 12,
  anchorToParent = false,
}: {
  id: string;
  label: string;
  children: ReactNode;
  align?: 'left' | 'center' | 'right';
  size?: number;
  /** Size and place the note against the nearest positioned ancestor (e.g. a card) instead of the icon, so it can never run off the screen edge. */
  anchorToParent?: boolean;
}) {
  const pos = align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
  return (
    <span className={`group inline-flex shrink-0 align-middle ${anchorToParent ? '' : 'relative'}`}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="rounded text-subtle hover:text-ink-2 focus:text-ink-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        <Info size={size} />
      </button>
      <span
        id={id}
        role="tooltip"
        className={`pointer-events-none absolute z-30 hidden rounded border border-line-strong bg-surface p-2 text-left text-[11px] font-normal normal-case leading-snug tracking-normal text-body shadow-xl group-hover:block group-focus-within:block ${anchorToParent ? 'left-2 right-2 top-11' : `top-5 w-64 ${pos}`}`}
      >
        {children}
      </span>
    </span>
  );
}
