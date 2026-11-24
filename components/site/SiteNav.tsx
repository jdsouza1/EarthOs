'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { NAV_ITEMS, isActive } from '@/lib/nav';

/**
 * Main navigation: plain text links, the current page underlined, then a "More" menu for the
 * reference pages. The links scroll sideways on small screens; the menu sits outside the scrolling
 * strip so it is never clipped. It is a native <details>, so it works without JavaScript.
 */
export function SiteNav() {
  const pathname = usePathname();
  const live = NAV_ITEMS.filter((i) => i.href);
  const main = live.filter((i) => !i.more);
  const more = live.filter((i) => i.more);
  const moreActive = more.some((i) => isActive(pathname, i.href!));
  const menu = useRef<HTMLDetailsElement>(null);

  // Close the menu after navigating, on a click outside it, or on Escape.
  useEffect(() => {
    menu.current?.removeAttribute('open');
  }, [pathname]);
  useEffect(() => {
    const close = (e: Event) => {
      const d = menu.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !d.contains(e.target as Node)) d.removeAttribute('open');
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', close);
    };
  }, []);

  const link = (active: boolean) =>
    `block border-b-2 py-2 transition-colors ${active ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`;

  return (
    <nav aria-label="Main" className="flex min-w-0 max-w-full items-center gap-6 text-sm">
      <div className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex w-max gap-6">
          {main.map((item) => {
            const active = isActive(pathname, item.href!);
            return (
              <li key={item.href}>
                <Link href={item.href!} aria-current={active ? 'page' : undefined} className={link(active)}>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {more.length > 0 && (
        <details ref={menu} className="group relative shrink-0">
          <summary
            className={`${link(moreActive)} flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden`}
            aria-label="More pages"
          >
            More
            <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <ul className="absolute right-0 z-30 mt-1 min-w-40 rounded-lg border border-line bg-surface p-1 shadow-lg">
            {more.map((item) => {
              const active = isActive(pathname, item.href!);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href!}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-md px-3 py-2 ${active ? 'bg-inset text-ink' : 'text-muted hover:bg-inset hover:text-ink'}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </nav>
  );
}
