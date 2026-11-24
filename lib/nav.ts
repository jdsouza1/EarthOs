/**
 * Every page in the site, in one place. The header nav, the footer and the 404 page all read
 * this list, so a new page only needs one line here to be reachable from everywhere.
 * Items without an href are planned pages: shown greyed out with their roadmap batch.
 */
export interface NavItem {
  label: string;
  href?: string;
  batch?: string; // roadmap batch for planned pages
  /** Shown under "More" in the header (the footer lists every page). */
  more?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/' },
  { label: 'Policies', href: '/policies' },
  { label: 'Forecasts', href: '/forecasts' },
  { label: 'Levers', href: '/levers' },
  { label: 'What if', href: '/what-if' },
  { label: 'Solved', href: '/solved' },
  { label: 'Brief', href: '/report' },
  { label: 'Funding', href: '/funding', more: true },
  { label: 'Data', href: '/data', more: true },
  { label: 'Methodology', href: '/methodology', more: true },
  { label: 'Change log', href: '/changelog', more: true },
];

export function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
