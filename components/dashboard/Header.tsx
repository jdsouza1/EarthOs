import Link from 'next/link';
import type { DashboardData } from '@/lib/types';
import { SiteNav } from '@/components/site/SiteNav';
import { ThemeToggle } from '@/components/site/ThemeToggle';

/** Rendered once in the root layout, so every page gets the same header and navigation (design direction B). */
export function Header({ isIllustrative }: { isIllustrative: boolean; source: DashboardData['source'] }) {
  return (
    <header className="border-b border-line print:hidden">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-x-8 gap-y-3 px-4 py-4 md:px-6">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="font-heading text-[22px] font-bold tracking-[0.02em] text-ink">EarthOS</span>
          <span className="text-xs text-subtle">Humanity&apos;s vital signs</span>
        </Link>
        <div className="order-last w-full min-w-0 md:order-none md:w-auto">
          <SiteNav />
        </div>
        <div className="ml-auto flex items-center gap-3">
          {isIllustrative && (
            <Link href="/methodology#illustrative" className="rounded-md border border-warning-line bg-warning-bg px-2 py-1 text-xs text-warning-text">
              Illustrative data, not a real estimate
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
