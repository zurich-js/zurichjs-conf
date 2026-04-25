/**
 * Tags Section
 * Popular tags across submissions
 */

import { Tag, Info } from 'lucide-react';
import { Tooltip } from '@/components/atoms';
import type { CfpTagCount } from '@/lib/types/cfp-analytics';

interface TagsSectionProps {
  topTags: CfpTagCount[];
}

export function TagsSection({ topTags }: TagsSectionProps) {
  if (topTags.length === 0) return null;

  const maxCount = topTags[0]?.count || 1;

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-5 h-5 text-brand-gray-dark" />
        <h3 className="text-lg font-semibold text-black">Popular Topics</h3>
        <Tooltip content="Most frequently tagged topics across all submissions — larger tags have more submissions.">
          <Info className="w-4 h-4 text-brand-gray-medium cursor-help" />
        </Tooltip>
      </div>
      <div className="flex flex-wrap gap-2">
        {topTags.map(({ name, count }) => {
          const intensity = Math.max(0.2, count / maxCount);
          return (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-gray-lightest px-3 py-1.5 text-sm"
              style={{
                backgroundColor: `rgba(241, 226, 113, ${intensity})`,
              }}
            >
              <span className="font-medium text-black">{name}</span>
              <span className="text-xs text-brand-gray-medium">{count}</span>
            </span>
          );
        })}
      </div>
    </section>
  );
}
