import { Cpu, Heart, Scale, ShieldAlert, type LucideIcon } from 'lucide-react';
import type { Severity, TierId } from '@/lib/types';
import { colors } from '@/lib/tokens';

/**
 * Per-tier and per-severity styling, built from the design tokens in lib/tokens.ts.
 * Class names are written out in full so Tailwind can detect them.
 */
export const TIER_THEME: Record<TierId, { icon: LucideIcon; hex: string; text: string; border: string }> = {
  existential: { icon: ShieldAlert, hex: colors['tier-existential'], text: 'text-tier-existential', border: 'border-tier-existential-line/50' },
  systemic: { icon: Scale, hex: colors['tier-systemic'], text: 'text-tier-systemic', border: 'border-tier-systemic-line/50' },
  tech: { icon: Cpu, hex: colors['tier-tech'], text: 'text-tier-tech', border: 'border-tier-tech-line/50' },
  flourishing: { icon: Heart, hex: colors['tier-flourishing'], text: 'text-tier-flourishing', border: 'border-tier-flourishing-line/50' },
};

export const SEVERITY_THEME: Record<Severity, { text: string; bg: string; border: string }> = {
  CRITICAL: { text: 'text-critical', bg: 'bg-critical-bg/40', border: 'border-critical-line' },
  ELEVATED: { text: 'text-elevated', bg: 'bg-elevated-bg/40', border: 'border-elevated-line' },
  WARNING: { text: 'text-warning', bg: 'bg-warning-bg/40', border: 'border-warning-line' },
};

/** Chart colours (Recharts needs raw values, not classes). */
export const CHART = {
  grid: colors.line,
  axis: colors.faint,
  tooltipBg: colors.surface,
};
