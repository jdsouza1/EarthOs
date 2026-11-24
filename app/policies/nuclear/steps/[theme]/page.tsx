import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getGameplans, getMasterPlan } from '@/lib/policies';
import { getStepDetails, type StepItem } from '@/lib/steps';
import { getNuclear } from '@/lib/nuclear';
import type { Confidence } from '@/lib/impact';

export const dynamicParams = false;

const CONF_LABEL: Record<Confidence, string> = { measured: 'Measured', modelled: 'Modelled', expert: 'Expert judgement' };

export async function generateStaticParams() {
  return [...(await getStepDetails('nuclear')).keys()].map((theme) => ({ theme }));
}

async function load(theme: string) {
  const [details, master, countries, plans] = await Promise.all([getStepDetails('nuclear'), getMasterPlan('nuclear'), getNuclear(), getGameplans('nuclear')]);
  const step = master.find((m) => m.theme === theme);
  const items = details.get(theme);
  if (!step || !items) return null;
  const who = countries
    .map((c) => ({ c, action: plans.get(c.iso3)?.find((s) => s.theme === theme) }))
    .filter((w) => w.action);
  return { step, items, who, total: countries.filter((c) => (plans.get(c.iso3)?.length ?? 0) > 0).length };
}

export async function generateMetadata({ params }: { params: Promise<{ theme: string }> }): Promise<Metadata> {
  const d = await load((await params).theme);
  return { title: d ? `${d.step.title} — Nuclear weapons — EarthOS` : 'Policies — EarthOS' };
}

function Source({ item }: { item: StepItem }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-subtle">
      <span className="tag text-subtle">{CONF_LABEL[item.confidence]}</span>
      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-accent hover:underline">
        {item.sourceName}
      </a>
    </p>
  );
}

export default async function NuclearStepPage({ params }: { params: Promise<{ theme: string }> }) {
  const d = await load((await params).theme);
  if (!d) notFound();
  const { step, items, who, total } = d;
  const what = items.filter((i) => i.block === 'what');
  const doSteps = items.filter((i) => i.block === 'do');

  return (
    <>
      <Link href="/policies/nuclear" className="tag flex items-center gap-1 self-start text-accent hover:underline">
        <ArrowLeft size={12} /> Nuclear weapons
      </Link>

      <section className="panel p-5">
        <h1 className="mb-1 text-lg font-bold text-ink">{step.title}</h1>
        <p className="max-w-3xl text-sm text-body">{step.why}</p>
        <p className="tag mt-2 text-[10px] text-subtle">
          Part of the Nuclear weapons master gameplan · in the gameplan of {who.length} of {total} nuclear-armed countries
        </p>
      </section>

      {what.length > 0 && (
        <section className="panel p-5">
          <h2 className="mb-3 text-sm font-bold text-body">In plain words</h2>
          <ul className="space-y-3">
            {what.map((i) => (
              <li key={i.order}>
                <p className="max-w-3xl text-sm text-body">{i.text}</p>
                <Source item={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel p-5">
        <h2 className="mb-1 text-sm font-bold text-body">How to achieve it</h2>
        <p className="mb-4 max-w-3xl text-xs text-muted">
          Summarised in EarthOS&apos;s own words from the sources shown. EarthOS adds no estimates of its own.
        </p>
        <ol className="flex flex-col gap-3">
          {doSteps.map((i) => (
            <li key={i.order} className="card flex gap-3 p-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-xs font-bold text-subtle">{i.order}</span>
              <div className="min-w-0">
                <p className="text-sm text-body">{i.text}</p>
                <Source item={i} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel p-5">
        <h2 className="mb-1 text-sm font-bold text-body">Who needs to do this</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted">Lowest security score first. Click a country for its full gameplan.</p>
        <ul className="flex flex-col gap-2">
          {who.map(({ c, action }) => (
            <li key={c.iso3}>
              <Link href={`/policies/nuclear/${c.iso3.toLowerCase()}`} className="card flex flex-col gap-1 p-3 hover:brightness-110 md:flex-row md:items-center md:gap-4">
                <span className="flex items-baseline gap-2 md:w-56 md:shrink-0">
                  <span className="text-sm font-bold text-ink">{c.country}</span>
                  <span className="font-mono text-[10px] text-body">{c.ntiScore}</span>
                </span>
                <span className="min-w-0 flex-1 text-xs text-muted">
                  <b className="text-ink-2">{action!.action}.</b> {action!.detail}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
