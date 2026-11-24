'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_ITEMS, isActive } from '@/lib/nav';

/** Main navigation: plain text links, the current page underlined. Scrolls sideways on small screens. */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <ul className="flex w-max gap-6 text-sm">
        {NAV_ITEMS.filter((i) => i.href).map((item) => {
          const active = isActive(pathname, item.href!);
          return (
            <li key={item.href}>
              <Link
                href={item.href!}
                aria-current={active ? 'page' : undefined}
                className={`block border-b-2 py-2 transition-colors ${
                  active ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
