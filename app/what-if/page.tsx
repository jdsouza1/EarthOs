import type { Metadata } from 'next';
import Link from 'next/link';
import { getWhatIfs } from '@/lib/whatif';
import { PageHeader } from '@/components/site/PageHeader';
import { WhatIfCard } from '@/components/whatif/WhatIfCard';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'What if — EarthOS' };

export default async function WhatIfPage() {
  const toggles = await getWhatIfs();
  return (
    <>
      <PageHeader
        label="What if"
        title="What changes if we act."
        summary="Pick a choice the world could make and see where published models say it leads, why, and who can make it happen."
      />
      <p className="max-w-2xl border-l-2 border-accent pl-4 text-sm text-body">
        EarthOS runs no simulation of its own: its projection methods were tested on past data and none passed (see{' '}
        <Link href="/forecasts" className="text-accent hover:underline">
          Forecasts
        </Link>
        ). For problems the world has already solved, see{' '}
        <Link href="/solved" className="text-accent hover:underline">
          Solved
        </Link>
        . Each card switches only between scenarios that one named source published from one model, and never mixes sources. Every figure is modelled.
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {toggles.map((w) => (
          <WhatIfCard key={w.id} w={w} />
        ))}
      </div>
    </>
  );
}
