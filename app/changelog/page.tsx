import type { Metadata } from 'next';
import { ChevronDown } from 'lucide-react';
import { getChangelog, type ChangeType } from '@/lib/changelog';
import { PageHeader } from '@/components/site/PageHeader';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Change log — EarthOS' };

const TYPE_STYLE: Record<ChangeType, { label: string; dot: string; badge: string }> = {
  data: { label: 'Data', dot: 'bg-accent', badge: 'border-accent-line bg-accent-bg/40 text-accent-strong' },
  method: { label: 'Method', dot: 'bg-good', badge: 'border-good-line bg-good-bg/40 text-good' },
  decision: { label: 'Decision', dot: 'bg-warning-text', badge: 'border-warning-line bg-warning-bg/40 text-warning-text' },
  site: { label: 'Site', dot: 'bg-muted', badge: 'border-line-strong bg-surface text-body' },
};

const DAY = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const SHORT = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const SHOWN = 12;

function Row({ e }: { e: Awaited<ReturnType<typeof getChangelog>>[number] }) {
  const s = TYPE_STYLE[e.type];
  return (
    <li className="border-t border-line first:border-t-0">
      <details className="group">
        <summary className="grid cursor-pointer list-none grid-cols-[4.5rem_5rem_1fr_auto] items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
          <time dateTime={e.date} title={DAY.format(new Date(e.date))} className="font-mono text-xs text-subtle">
            {SHORT.format(new Date(e.date))}
          </time>
          <span className={`justify-self-start rounded border px-1.5 py-0.5 text-[11px] ${s.badge}`}>{s.label}</span>
          <span className="min-w-0 text-[15px] text-ink">{e.title}</span>
          <ChevronDown size={16} className="text-subtle transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="mb-3 flex flex-col gap-1 sm:ml-[10.5rem]">
          <p className="max-w-3xl text-sm text-muted">{e.detail}</p>
          {e.affects && <p className="font-mono text-[11px] text-subtle">Affects: {e.affects}</p>}
        </div>
      </details>
    </li>
  );
}

export default async function ChangelogPage() {
  const entries = await getChangelog();
  const first = entries.slice(0, SHOWN);
  const rest = entries.slice(SHOWN);

  return (
    <>
      <PageHeader
        label="Change log"
        title="What changed, and why."
        summary="Every change to the data, the method or the site, newest first. Tap a change for the reason."
      >
        <div className="flex flex-wrap gap-2 text-xs">
          {(Object.keys(TYPE_STYLE) as ChangeType[]).map((t) => (
            <span key={t} className={`rounded border px-2 py-0.5 ${TYPE_STYLE[t].badge}`}>
              {TYPE_STYLE[t].label} · {entries.filter((e) => e.type === t).length}
            </span>
          ))}
        </div>
      </PageHeader>

      <section className="panel px-5 py-1" aria-label="Changes">
        <ol>
          {first.map((e) => (
            <Row key={`${e.date}-${e.title}`} e={e} />
          ))}
        </ol>
        {rest.length > 0 && (
          <details className="group border-t border-line">
            <summary className="cursor-pointer list-none py-3 text-sm font-semibold text-accent hover:underline [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">Show {rest.length} earlier changes</span>
              <span className="hidden group-open:inline">Show fewer</span>
            </summary>
            <ol>
              {rest.map((e) => (
                <Row key={`${e.date}-${e.title}`} e={e} />
              ))}
            </ol>
          </details>
        )}
      </section>
    </>
  );
}
