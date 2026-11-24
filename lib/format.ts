/** Number and date formatting shared by server and client code (no 'use client' here, so route handlers can call it). */
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const COMPACT = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export function formatValue(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return COMPACT.format(value);
  const digits = abs >= 1000 ? 0 : abs >= 100 ? 1 : 2;
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** "2026" for yearly series, "Oct 2026" for monthly ones. */
export function formatPeriod(date: string, annual: boolean) {
  return annual ? date.slice(0, 4) : MONTH.format(new Date(date));
}

/** "+1.82", "−0.10", "±0.00". */
export function formatDelta(delta: number) {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  return `${sign}${formatValue(Math.abs(delta))}`;
}
