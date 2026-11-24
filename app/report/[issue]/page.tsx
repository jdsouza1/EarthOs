import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { buildBrief, issueLabel } from '@/lib/brief';
import { getIssue, listIssues } from '@/lib/briefArchive';
import { BriefView } from '@/components/report/BriefView';
import { BriefPicker } from '@/components/report/BriefPicker';

export const dynamic = 'force-static';
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await listIssues()).map((issue) => ({ issue }));
}

export async function generateMetadata({ params }: { params: Promise<{ issue: string }> }): Promise<Metadata> {
  const { issue } = await params;
  return { title: `The Brief, ${issueLabel(issue)} — EarthOS` };
}

/** A saved past issue, shown exactly as it was generated that month. */
export default async function ArchivedBrief({ params }: { params: Promise<{ issue: string }> }) {
  const { issue } = await params;
  const [live, saved] = await Promise.all([buildBrief(), listIssues()]);
  if (!saved.includes(issue)) notFound();
  if (issue === live.key) redirect('/report');
  const b = await getIssue(issue);
  const issues = [...new Set([live.key, ...saved])].sort().reverse();
  return <BriefView b={b} archived picker={<BriefPicker issues={issues} current={issue} latest={live.key} />} />;
}
