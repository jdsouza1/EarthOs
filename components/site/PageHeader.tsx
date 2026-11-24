import type { ReactNode } from 'react';

/** The shared page opening: a small section label, a plain-language title and one summary line. */
export function PageHeader({ label, title, summary, children }: { label: string; title: ReactNode; summary?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3">
      <p className="text-sm text-subtle">{label}</p>
      <h1 className="max-w-3xl leading-tight">{title}</h1>
      {summary && <p className="max-w-2xl text-lg text-muted">{summary}</p>}
      {children}
    </header>
  );
}
