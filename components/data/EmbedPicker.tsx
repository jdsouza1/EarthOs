'use client';

import { useEffect, useState } from 'react';

interface Option {
  id: string;
  name: string;
  area: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          /* clipboard blocked: the text is still selectable */
        }
      }}
      className="rounded-md border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-accent hover:text-accent"
    >
      {done ? 'Copied' : label}
    </button>
  );
}

/** Pick an indicator, see its card, copy the embed code or the share link, or download the picture. */
export function EmbedPicker({ options, site, height }: { options: Option[]; site: string; height: number }) {
  const [id, setId] = useState(options[0]?.id ?? '');

  // /data?card=<id> (the Share link on each Dashboard card) preselects that indicator.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('card');
    if (wanted && options.some((o) => o.id === wanted)) setId(wanted);
  }, [options]);

  const link = `${site}/embed/${id}`;
  const code = `<iframe src="${link}" title="EarthOS indicator" width="100%" height="${height}" style="max-width:380px;border:0" loading="lazy"></iframe>`;

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,380px)_1fr]">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Indicator
          <select
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="rounded-md border border-line-strong bg-surface px-2 py-2 text-sm text-ink-2"
          >
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} ({o.area})
              </option>
            ))}
          </select>
        </label>
        <iframe key={id} src={`/embed/${id}`} title="Preview of the embedded card" height={height} className="w-full rounded-xl border-0" loading="lazy" />
        <p className="text-xs text-subtle">The card follows each reader&apos;s light or dark setting and updates when EarthOS does.</p>
      </div>

      <div className="flex flex-col gap-4">
        <div className="card p-4">
          <h3 className="mb-1 text-sm font-bold text-ink-2">On a website or blog</h3>
          <p className="mb-2 text-xs text-muted">Paste this where the card should appear.</p>
          <textarea readOnly value={code} rows={3} onFocus={(e) => e.currentTarget.select()} className="w-full resize-none rounded-md border border-line bg-inset p-2 font-mono text-[11px] text-body" />
          <div className="mt-2">
            <CopyButton text={code} label="Copy embed code" />
          </div>
        </div>
        <div className="card p-4">
          <h3 className="mb-1 text-sm font-bold text-ink-2">On LinkedIn and other social posts</h3>
          <p className="mb-2 text-xs text-muted">Share the link and the post shows the card as a picture, or download the picture and add it yourself.</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={link} label="Copy share link" />
            <a href={`/embed/${id}/image`} download={`earthos-${id}.png`} className="rounded-md border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-accent hover:text-accent">
              Download image
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
