import type { Metadata } from 'next';
import { buildBrief } from '@/lib/brief';
import { listIssues } from '@/lib/briefArchive';
import { BriefView } from '@/components/report/BriefView';
import { BriefPicker } from '@/components/report/BriefPicker';

// Built at deploy time from the same data files as the rest of the site, so the latest Brief is always as current as the dashboard.
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'The Brief — EarthOS',
  description: "A short read on humanity's vital signs, written from the latest EarthOS data.",
};

export default async function BriefPage() {
  const [b, saved] = await Promise.all([buildBrief(), listIssues()]);
  // The live issue counts as this month's even before the monthly run has saved it.
  const issues = [...new Set([b.key, ...saved])].sort().reverse();
  return <BriefView b={b} archived={false} picker={<BriefPicker issues={issues} current={b.key} latest={b.key} />} />;
}
