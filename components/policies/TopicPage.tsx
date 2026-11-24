import type { ReactNode } from 'react';
import { POLICY_TOPICS } from '@/lib/policyTopics';
import { getKeyNumbers } from '@/lib/keyNumbers';
import { InfoTip } from '@/components/ui/InfoTip';
import { TopicSelect } from './TopicSelect';
import { KeyNumbers } from './KeyNumbers';

/**
 * Shared layout for every policy topic page: the topic dropdown and key numbers in a side column,
 * then a question-style title, one short summary line and the page's sections.
 * Longer explanations live in the info tip and in the sources section, not in the header.
 */
export async function TopicPage({
  topic,
  title,
  summary,
  aboutLabel,
  about,
  children,
}: {
  topic: string;
  title: string;
  summary: ReactNode;
  aboutLabel: string;
  about: ReactNode;
  children: ReactNode;
}) {
  const keyNumbers = await getKeyNumbers(topic);
  const label = POLICY_TOPICS.find((t) => t.id === topic)!.label;
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <aside className="flex w-full flex-col gap-5 lg:sticky lg:top-6 lg:w-[300px] lg:shrink-0">
        <TopicSelect current={topic} />
        <div className="hidden lg:block">
          <KeyNumbers items={keyNumbers} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-sm text-subtle">Policies · {label}</p>
          <div className="flex items-start gap-2">
            <h1 className="leading-tight">{title}</h1>
            <span className="mt-2">
              <InfoTip id={`${topic}-about`} label={aboutLabel} align="right" size={18}>
                {about}
              </InfoTip>
            </span>
          </div>
          <p className="max-w-2xl text-base text-body">{summary}</p>
        </header>
        <div className="lg:hidden">
          <KeyNumbers items={keyNumbers} />
        </div>
        {children}
      </div>
    </div>
  );
}
