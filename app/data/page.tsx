import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/site/PageHeader';
import { EmbedPicker } from '@/components/data/EmbedPicker';
import { getIndicators } from '@/lib/indicators';
import { getDashboardData } from '@/lib/data';
import { formatDay, getRefreshStatus } from '@/lib/refresh';
import { EMBED_HEIGHT } from '@/lib/embed';
import { GITHUB_URL, SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';
export const metadata: Metadata = { title: 'Use the data — EarthOS' };

export default async function DataPage() {
  const [indicators, data, refresh] = await Promise.all([getIndicators(), getDashboardData(), getRefreshStatus()]);
  const tierName = new Map(data.tiers.map((t) => [t.id, t.name]));
  const options = data.tiers.flatMap((t) =>
    indicators
      .filter((i) => i.tierId === t.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((i) => ({ id: i.id, name: i.name, area: tierName.get(i.tierId) ?? i.tierId })),
  );
  const first = options[0]?.id ?? '';

  const files = [
    { name: 'Latest values', format: 'JSON', href: '/data/latest.json', what: `The newest reading of all ${indicators.length} indicators and the four area scores, in one small file.` },
    { name: 'Full history', format: 'CSV', href: '/data/indicators.csv', what: 'Every reading of every indicator since each series began, one row per reading. Opens in Excel or Google Sheets.' },
    { name: 'One indicator', format: 'JSON', href: `/data/series/${first}.json`, what: 'The full history of a single indicator. Swap the id in the address for any other indicator.' },
  ];

  return (
    <>
      <PageHeader
        label="Use the data"
        title="Take the numbers with you."
        summary="Every EarthOS number is free to download, embed and share. Each one keeps its link to the organisation that published it."
      >
        {refresh && (
          <p className="text-xs text-subtle">
            Data checked {formatDay(refresh.last.checkedAt)}. The files and cards below update automatically each month; next check {formatDay(refresh.nextCheck)}.
          </p>
        )}
      </PageHeader>

      <section id="embed" className="panel scroll-mt-6 p-5">
        <h2 className="eyebrow mb-1">Share or embed a card</h2>
        <p className="mb-4 max-w-3xl text-xs text-muted">A live indicator card for your website, newsletter or posts. It links back to its source and to EarthOS.</p>
        <EmbedPicker options={options} site={SITE_URL} height={EMBED_HEIGHT} />
      </section>

      <section className="panel p-5">
        <h2 className="eyebrow mb-1">Download</h2>
        <p className="mb-4 max-w-3xl text-xs text-muted">
          Free to use, no sign-up. Any website or app can also read these files directly.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-subtle">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-semibold">File</th>
                <th className="py-2 pr-4 font-semibold">Format</th>
                <th className="py-2 font-semibold">What it holds</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.href} className="border-b border-line align-top last:border-0">
                  <td className="py-3 pr-4">
                    <a href={f.href} className="font-semibold text-accent hover:underline">
                      {f.name}
                    </a>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted">{f.format}</td>
                  <td className="py-3 text-muted">{f.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-subtle">
          Every other file behind the site, including the policy ratings, levers and forecasts, is in the{' '}
          <a href={`${GITHUB_URL}/tree/main/data`} target="_blank" rel="noreferrer" className="text-accent hover:underline">
            open-source repository
          </a>
          , along with the code. What each file holds is listed on the <Link href="/methodology" className="text-accent hover:underline">Methodology</Link> page.
        </p>
      </section>

      <section className="panel p-5">
        <h2 className="eyebrow mb-1">Terms</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-5 text-xs text-muted">
          <li>Measured values belong to the organisations that publish them, such as NOAA, NASA, the UN and the World Bank. Each keeps its own terms of use, linked from every row.</li>
          <li>The area scores are EarthOS&apos;s own calculation, explained on the Methodology page. Please name EarthOS when you use them.</li>
          <li>The code is open source under the MIT licence.</li>
        </ul>
      </section>
    </>
  );
}
