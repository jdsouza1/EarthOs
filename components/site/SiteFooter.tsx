import Link from 'next/link';
import { NAV_ITEMS } from '@/lib/nav';

export function SiteFooter() {
  const live = NAV_ITEMS.filter((i) => i.href);
  return (
    <footer className="mt-2 flex flex-col gap-2 border-t border-line pt-4 font-mono text-[11px] text-subtle md:flex-row md:items-center md:justify-between">
      <span className="tracking-widest">EarthOS · Humanity&apos;s vital signs</span>
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
