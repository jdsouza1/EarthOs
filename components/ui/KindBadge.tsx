/**
 * The one badge for how a figure was produced, used on every page so the three labels always look the same:
 * measured (counted or observed), modelled (calculated from a model or estimate), expert (a judgement).
 * Other labels a page needs (pledged, target) share the neutral style.
 */
const STYLE: Record<string, string> = {
  measured: 'border-good-line bg-good-bg/40 text-good',
  modelled: 'border-accent-line bg-accent-bg text-accent',
  expert: 'border-warning-line bg-warning-bg/40 text-warning-text',
};
const LABEL: Record<string, string> = { measured: 'Measured', modelled: 'Modelled', expert: 'Expert judgement' };

export function KindBadge({ kind, label }: { kind: string; label?: string }) {
  return (
    <span className={`tag inline-block rounded border px-1.5 py-0.5 text-[10px] ${STYLE[kind] ?? 'border-line text-subtle'}`}>{label ?? LABEL[kind] ?? kind}</span>
  );
}
