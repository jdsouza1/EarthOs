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
  /** Section heading inside the More menu. */
  group?: 'Explore' | 'About and data';
}

export const NAV_ITEMS: NavItem[] = [
  // Main menu in story order: where we are, what governments do, what would change it, what it costs,
  // where experts think we are heading, proof it can be done, then the summary. NextStep follows the same order.
  { label: 'Dashboard', href: '/' },
  { label: 'Policies', href: '/policies' },
  { label: 'What if', href: '/what-if' },
  { label: 'Funding', href: '/funding' },
  { label: 'Forecasts', href: '/forecasts' },
  { label: 'Solved', href: '/solved' },
  { label: 'Brief', href: '/report' },
  { group: 'Explore', label: 'Levers', href: '/levers', more: true },
  { group: 'Explore', label: 'Promises', href: '/promises', more: true },
  { group: 'Explore', label: 'Priorities', href: '/priorities', more: true },
  { group: 'Explore', label: 'Not covered yet', href: '/not-covered', more: true },
  { group: 'About and data', label: 'Data', href: '/data', more: true },
  { group: 'About and data', label: 'Methodology', href: '/methodology', more: true },
  { group: 'About and data', label: 'Change log', href: '/changelog', more: true },
];

export function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
