import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/**
 * "Next in the story" strip above the footer. The core pages run in the order of the main menu
 * (Dashboard → Forecasts → Policies → What if → Funding → Solved → Brief), and the Brief loops back.
 */
export const STORY: Record<string, { label: string; text: string; href: string; page: string }> = {
  '/': { label: 'Next', text: 'Where experts think we are heading', href: '/forecasts', page: 'Forecasts' },
  '/forecasts': { label: 'Next', text: 'What governments are doing now', href: '/policies', page: 'Policies' },
  '/policies': { label: 'Next', text: 'See what published scenarios say if we change course', href: '/what-if', page: 'What if' },
  '/what-if': { label: 'Next', text: 'See what it costs to close the gap', href: '/funding', page: 'Funding' },
  '/funding': { label: 'Next', text: 'Proof humanity has solved big problems before', href: '/solved', page: 'Solved' },
  '/solved': { label: 'Next', text: "Read this month's short summary", href: '/report', page: 'Brief' },
  '/report': { label: 'Back to the start', text: 'The live dashboard', href: '/', page: 'Dashboard' },
};

export function NextStep({ from }: { from: keyof typeof STORY }) {
  const s = STORY[from];
  if (!s) return null;
  return (
    <nav aria-label="Next in the story" className="print:hidden">
      <Link
        href={s.href}
        className="group flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-4 py-3 text-sm transition-colors hover:border-accent"
      >
        <span className="text-muted">
          <span className="tag mr-2 text-[10px] text-subtle">{s.label}</span>
          {s.text}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-ink group-hover:text-accent">
          {s.page}
          <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
    </nav>
  );
}
