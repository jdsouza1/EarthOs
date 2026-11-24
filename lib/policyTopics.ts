/** Policy topics shown in the Policies dropdown. Topics without an href are planned (greyed out). */
export interface PolicyTopic {
  id: string;
  label: string;
  href?: string;
}

export const POLICY_TOPICS: PolicyTopic[] = [
  { id: 'climate', label: 'Climate', href: '/policies' },
  { id: 'nuclear', label: 'Nuclear weapons', href: '/policies/nuclear' },
  { id: 'nature', label: 'Nature & biodiversity', href: '/policies/nature' },
  { id: 'food', label: 'Food & hunger', href: '/policies/food' },
  { id: 'health', label: 'Health & vaccination', href: '/policies/health' },
  { id: 'ai', label: 'AI governance', href: '/policies/ai' },
];
