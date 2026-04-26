/**
 * Content Insights Section
 * AI topic density and submission completeness analytics
 */

import { Brain, FileText, Info } from 'lucide-react';
import { Tooltip } from '@/components/atoms';
import type { CfpContentInsights } from '@/lib/types/cfp-analytics';

interface ContentInsightsSectionProps {
  contentInsights: CfpContentInsights;
}

function pct(count: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}

function MetricBar({ label, count, total }: { label: string; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <span className="text-xs sm:text-sm text-brand-gray-dark w-24 sm:w-40 shrink-0">{label}</span>
      <div className="flex-1 min-w-0 bg-text-brand-gray-lightest rounded-full h-5 overflow-hidden">
        <div
          className="h-full bg-yellow-300 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs sm:text-sm font-medium text-black w-16 sm:w-20 text-right shrink-0">
        {count} ({pct(count, total)})
      </span>
    </div>
  );
}

export function ContentInsightsSection({ contentInsights }: ContentInsightsSectionProps) {
  const {
    totalAnalyzed,
    aiTopicCount,
    aiKeywords,
    withSpeakerNotes,
    withOutline,
    withSlides,
    withRecording,
  } = contentInsights;

  if (totalAnalyzed === 0) return null;

  return (
    <section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Topic Density */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-brand-gray-dark" />
            <h3 className="text-lg font-semibold text-black">AI Topic Density</h3>
            <Tooltip content="Submissions mentioning AI, LLM, MCP, RAG, agents, and related topics in their title, abstract, notes, outline, or tags.">
              <Info className="w-4 h-4 text-brand-gray-medium cursor-help" />
            </Tooltip>
          </div>

          <div className="mb-4 flex flex-wrap items-baseline gap-2 sm:gap-3">
            <span className="text-3xl font-bold text-black">{pct(aiTopicCount, totalAnalyzed)}</span>
            <span className="text-sm text-brand-gray-medium">
              {aiTopicCount} of {totalAnalyzed} submissions mention AI topics
            </span>
          </div>

          {aiKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {aiKeywords.map(({ keyword, count }) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm"
                >
                  <span className="font-medium text-purple-900">{keyword}</span>
                  <span className="text-xs text-purple-500">{count}</span>
                </span>
              ))}
            </div>
          )}

          {aiKeywords.length === 0 && (
            <p className="text-sm text-brand-gray-medium">No AI-related keywords detected in submissions.</p>
          )}
        </div>

        {/* Submission Completeness */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-brand-gray-dark" />
            <h3 className="text-lg font-semibold text-black">Submission Completeness</h3>
            <Tooltip content="How many speakers filled in optional fields like notes, outline, slides, and recordings.">
              <Info className="w-4 h-4 text-brand-gray-medium cursor-help" />
            </Tooltip>
          </div>

          <div className="space-y-3">
            <MetricBar label="Speaker Notes" count={withSpeakerNotes} total={totalAnalyzed} />
            <MetricBar label="Talk Outline" count={withOutline} total={totalAnalyzed} />
            <MetricBar label="Slides URL" count={withSlides} total={totalAnalyzed} />
            <MetricBar label="Previous Recording" count={withRecording} total={totalAnalyzed} />
          </div>
        </div>
      </div>
    </section>
  );
}
