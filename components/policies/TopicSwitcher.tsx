import { POLICY_TOPICS } from '@/lib/policyTopics';
import { TopicSelect } from './TopicSelect';

/**
 * A standard "Topic" dropdown above the topic title (22 Nov 2026: Joel asked for a dropdown most people recognise,
 * replacing the small arrow beside the title). children (e.g. an InfoTip) sit beside the title.
 */
export function TopicSwitcher({ current, children }: { current: string; children?: React.ReactNode }) {
  const active = POLICY_TOPICS.find((t) => t.id === current)!;
  return (
    <div className="flex w-full flex-col gap-5">
      <TopicSelect current={current} />
      <div>
        <p className="text-sm text-subtle">Policies</p>
        <div className="flex items-center gap-2">
          <h1>{active.label}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
