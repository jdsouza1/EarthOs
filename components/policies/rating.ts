import type { CatRating } from '@/lib/policies';

/** Colour and plain-English meaning for each Climate Action Tracker rating. */
export const RATING: Record<CatRating, { cls: string; bar: string; world: string }> = {
  'Role model': { cls: 'border-good-line bg-good-bg/40 text-good', bar: 'bg-good', world: 'Better than 1.5 °C compatible' },
  '1.5°C Paris Agreement compatible': { cls: 'border-good-line bg-good-bg/40 text-good', bar: 'bg-good', world: 'Consistent with 1.5 °C' },
  'Almost sufficient': { cls: 'border-accent-line bg-accent-bg/40 text-accent-strong', bar: 'bg-accent', world: 'Below 2 °C if all did the same' },
  Insufficient: { cls: 'border-warning-line bg-warning-bg/40 text-warning-text', bar: 'bg-warning', world: 'Below 3 °C if all did the same' },
  'Highly insufficient': { cls: 'border-elevated-line bg-elevated-bg/40 text-elevated', bar: 'bg-elevated', world: 'Below 4 °C if all did the same' },
  'Critically insufficient': { cls: 'border-critical-line bg-critical-bg/40 text-critical', bar: 'bg-critical', world: '4 °C or more if all did the same' },
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDate(d: string) {
  const [y, m, day] = d.split('-');
  if (!m) return y;
  const mon = MONTHS[Number(m) - 1];
  return day ? `${mon} ${Number(day)}, ${y}` : `${mon} ${y}`;
}

export const slug = (iso3: string) => iso3.toLowerCase();
