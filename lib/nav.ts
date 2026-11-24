/**
 * Every page in the site, in one place. The header nav, the footer and the 404 page all read
 * this list, so a new page only needs one line here to be reachable from everywhere.
 * Items without an href are planned pages: shown greyed out with their roadmap batch.
 */
export interface NavItem {
  label: string;
  href?: string;
  batch?: string; // roadmap batch for planned pages
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Levers', href: '/levers' },
  { label: 'Policies', href: '/policies' },
  { label: 'Forecasts', href: '/forecasts' },
  { label: 'What if', href: '/what-if' },
  { label: 'Solved', href: '/solved' },
  { label: 'Brief', href: '/report' },
  { label: 'Methodology', href: '/methodology' },
  { label: 'Change log', href: '/changelog' },
];

export function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
