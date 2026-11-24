'use client';

import { Printer } from 'lucide-react';

/** Opens the browser's print dialog, where the Brief can also be saved as a PDF. Print styles switch to light colours. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg border border-line-strong px-3 py-2 text-sm text-ink hover:border-accent hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <Printer size={16} aria-hidden="true" />
      Print or save as PDF
    </button>
  );
}
