/**
 * EarthOS design tokens: the single source of truth for colour (design direction B, "Night observatory", 22 Nov 2026).
 *
 * Two palettes: dark (default, direction B) and light (day mode). The root layout writes both into CSS variables:
 * light on :root, dark on html.dark. The theme switch in the header toggles the "dark" class.
 * - Tailwind classes use them by name: bg-surface, text-muted, border-line, text-critical …
 *   (app/globals.css maps each name to a CSS variable).
 * - Charts and inline styles use `colors`, which holds var(--tok-…) references, so they follow the theme too.
 * Change a value here and every page and chart follows.
 */
export const light = {
  // Surfaces
  canvas: '#f5f5f7', // page background
  surface: '#ffffff', // cards
  inset: '#f5f5f7', // boxes inside cards
  line: '#e5e5ea', // default border, chart grid
  'line-strong': '#d1d1d6',

  // Text, darkest to lightest
  ink: '#1d1d1f',
  'ink-2': '#1d1d1f',
  body: '#3a3a3c',
  muted: '#5f6368',
  subtle: '#636366',
  faint: '#8e8e93', // chart axes only
  ghost: '#c7c7cc',

  // Accent (links, active nav, selection)
  accent: '#0a66c2',
  'accent-strong': '#0a4f96',
  'accent-line': '#b6d4f5',
  'accent-bg': '#e8f1fc',

  // Status
  good: '#1f7a4d',
  'good-line': '#b7e4c7',
  'good-bg': '#e9f7ef',

  // Severity (bottlenecks). warning-text is used for badge text.
  critical: '#b42318',
  'critical-line': '#f5c2bd',
  'critical-bg': '#fdecea',
  elevated: '#b4440e',
  'elevated-line': '#f8cfb4',
  'elevated-bg': '#fdeee4',
  warning: '#a15c07',
  'warning-text': '#8a4b05',
  'warning-line': '#f3d9a4',
  'warning-bg': '#fdf3df',

  // Tiers (cards, chart lines, labels)
  'tier-existential': '#1d4ed8',
  'tier-existential-line': '#bfdbfe',
  'tier-systemic': '#0f766e',
  'tier-systemic-line': '#99f6e4',
  'tier-tech': '#6d28d9',
  'tier-tech-line': '#ddd6fe',
  'tier-flourishing': '#a21caf',
  'tier-flourishing-line': '#f5d0fe',
} as const;

export type ColorToken = keyof typeof light;

export const dark: Record<ColorToken, string> = {
  canvas: '#070b14',
  surface: '#0e1524',
  inset: '#0a101c',
  line: '#1a2233',
  'line-strong': '#2a3448',
  ink: '#ffffff',
  'ink-2': '#e6ebf5',
  body: '#c3cde0',
  muted: '#a9b6cc',
  subtle: '#8fa0bd',
  faint: '#5f6e88',
  ghost: '#2a3448',
  accent: '#7cc4ff',
  'accent-strong': '#b3dcff',
  'accent-line': '#1d3a5c',
  'accent-bg': '#0d2136',
  good: '#4ade80',
  'good-line': '#14532d',
  'good-bg': '#052e16',
  critical: '#ff8a7a',
  'critical-line': '#7a2414',
  'critical-bg': '#3a1708',
  elevated: '#ffb38a',
  'elevated-line': '#7c3a12',
  'elevated-bg': '#3a1d0a',
  warning: '#f5c451',
  'warning-text': '#f3dc7a',
  'warning-line': '#6b5410',
  'warning-bg': '#3d360c',
  'tier-existential': '#60a5fa',
  'tier-existential-line': '#1e3a8a',
  'tier-systemic': '#2dd4bf',
  'tier-systemic-line': '#134e4a',
  'tier-tech': '#a78bfa',
  'tier-tech-line': '#4c1d95',
  'tier-flourishing': '#e879f9',
  'tier-flourishing-line': '#701a75',
};

/** var(--tok-…) references for charts and inline styles: they follow light/dark automatically. */
export const colors = Object.fromEntries(Object.keys(light).map((k) => [k, `var(--tok-${k})`])) as Record<ColorToken, string>;

/** A translucent version of a token, for tinted backgrounds and borders (pct = 0–100). */
export function tint(color: string, pct: number): string {
  return `color-mix(in oklab, ${color} ${pct}%, transparent)`;
}

/** `:root{…} html.dark{…}` — written once in the root layout. */
export function cssVariables(): string {
  const block = (p: Record<string, string>) =>
    Object.entries(p)
      .map(([name, value]) => `--tok-${name}:${value};`)
      .join('');
  return `:root{${block(light)}color-scheme:light}html.dark{${block(dark)}color-scheme:dark}@media print{html.dark{${block(light)}color-scheme:light}}`;
}
