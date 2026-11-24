import Link from 'next/link';
import { NAV_ITEMS } from '@/lib/nav';
import { formatDay, getRefreshStatus } from '@/lib/refresh';

export async function SiteFooter() {
  const live = NAV_ITEMS.filter((i) => i.href);
  const refresh = await getRefreshStatus();
  return (
    <footer className="mt-2 flex flex-col gap-2 border-t border-line pt-4 font-mono text-[11px] text-subtle md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <span className="tracking-widest">EarthOS · Humanity&apos;s vital signs</span>
        {refresh && (
          <span>
            Data checked <time dateTime={refresh.last.checkedAt}>{formatDay(refresh.last.checkedAt)}</time>
            {' · '}checked automatically each month, next {formatDay(refresh.nextCheck)}
            {' · '}
            <Link href="/changelog" className="underline decoration-dotted underline-offset-2 hover:text-body">
              what changed
            </Link>
          </span>
        )}
      </div>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {live.map((i) => (
            <li key={i.href}>
              <Link href={i.href!} className="hover:text-body">
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
