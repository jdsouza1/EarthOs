import type { KeyNumber } from '@/lib/keyNumbers';

const CONF_LABEL = { measured: 'Measured', modelled: 'Modelled', expert: 'Expert judgement' } as const;

function Source({ k }: { k: KeyNumber }) {
  return (
    <p className="text-[11px] text-subtle">
      {CONF_LABEL[k.confidence]} ·{' '}
      <a href={k.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
        {k.sourceName}
      </a>
    </p>
  );
}

/** The topic's headline numbers: one large, the rest as rows. Each names its source. */
export function KeyNumbers({ items }: { items: KeyNumber[] }) {
  if (items.length === 0) return null;
  const [lead, ...rest] = items;
  return (
    <section aria-label="Key numbers" className="flex flex-col gap-3">
      <div className="panel flex flex-col gap-2 p-5">
        <span className="text-sm text-muted">{lead.label}</span>
        <span className="font-mono text-4xl font-bold leading-none text-ink">{lead.value}</span>
        {lead.context && <span className="text-sm text-body">{lead.context}</span>}
        <Source k={lead} />
      </div>
      {rest.length > 0 && (
        <div className="panel flex flex-col p-5">
          {rest.map((k) => (
            <div key={k.order} className="flex flex-col gap-1 border-t border-line py-3 first:border-t-0 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-muted">{k.label}</span>
                <span className="shrink-0 font-mono text-base font-bold text-ink">{k.value}</span>
              </div>
              {k.context && <span className="text-xs text-body">{k.context}</span>}
              <Source k={k} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
