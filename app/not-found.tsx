import Link from 'next/link';
import { NAV_ITEMS } from '@/lib/nav';

export default function NotFound() {
  const live = NAV_ITEMS.filter((i) => i.href);
  return (
    <section className="panel p-6">
      <div className="mb-1 font-mono text-xs text-critical">404</div>
      <h1 className="mb-2 text-lg font-bold text-ink">This page doesn&apos;t exist (yet)</h1>
      <p className="mb-4 text-sm text-muted">It may be planned for a later batch. Here are the pages that are live:</p>
      <ul className="flex flex-wrap gap-2 font-mono text-xs">
        {live.map((i) => (
          <li key={i.href}>
            <Link href={i.href!} className="block rounded border border-line px-3 py-1.5 text-accent hover:border-accent-line">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
