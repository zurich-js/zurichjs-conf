/**
 * Speaker Feedback Panel
 * Unified view of all committee feedback across a speaker's submissions.
 * Used by admins to understand CFP outcomes and explain them to speakers.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Copy, Check, Loader2, ExternalLink, FileText, MessageSquare } from 'lucide-react';
import {
  cfpQueryKeys,
  type SpeakerFeedbackSubmission,
  type SpeakerFeedbackAggregate,
} from '@/lib/types/cfp-admin';
import { fetchSpeakerFeedback } from '@/lib/cfp/adminApi';
import { StatusBadge } from '../StatusBadge';

interface SpeakerFeedbackPanelProps {
  speakerId: string;
  speakerName: string;
  onOpenSubmission?: (submissionId: string) => void;
  loadingSubmissionId?: string | null;
}

function formatScore(value: number | null): string {
  if (value === null) return '-';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function scoreColor(value: number | null): string {
  if (value === null) return 'text-gray-400';
  if (value >= 4) return 'text-green-600';
  if (value >= 3) return 'text-yellow-600';
  return 'text-red-600';
}

function AggregateRow({ aggregate, reviewCount }: { aggregate: SpeakerFeedbackAggregate; reviewCount: number }) {
  const items: Array<{ label: string; value: number | null }> = [
    { label: 'Overall', value: aggregate.overall },
    { label: 'Relevance', value: aggregate.relevance },
    { label: 'Depth', value: aggregate.technical_depth },
    { label: 'Clarity', value: aggregate.clarity },
    { label: 'Originality', value: aggregate.diversity },
  ];

  if (reviewCount === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3 text-center">
        <p className="text-sm text-gray-500">No reviews yet for this submission</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-1.5 rounded-lg border border-gray-200 bg-white p-2 sm:gap-2 sm:p-3">
      {items.map(({ label, value }) => (
        <div key={label} className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
          <p className={`text-base font-bold sm:text-lg ${scoreColor(value)}`}>{formatScore(value)}</p>
        </div>
      ))}
    </div>
  );
}

function CopyButton({ getText, label }: { getText: () => string; label: string }) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-black hover:bg-gray-50 cursor-pointer"
      title={`Copy ${label}`}
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function buildSubmissionScoreText(sub: SpeakerFeedbackSubmission): string {
  const a = sub.aggregate;
  const lines = [
    `"${sub.title}" (${sub.status})`,
    `${sub.review_count} review(s)`,
    `Overall: ${formatScore(a.overall)}`,
    `Relevance: ${formatScore(a.relevance)}`,
    `Depth: ${formatScore(a.technical_depth)}`,
    `Clarity: ${formatScore(a.clarity)}`,
    `Originality: ${formatScore(a.diversity)}`,
  ];
  return lines.join('\n');
}

function buildSubmissionFeedbackText(sub: SpeakerFeedbackSubmission): string {
  const parts: string[] = [buildSubmissionScoreText(sub), ''];
  if (sub.reviews.length === 0) {
    parts.push('(No reviews)');
    return parts.join('\n');
  }
  for (const r of sub.reviews) {
    const reviewer = r.reviewer.name || r.reviewer.email;
    parts.push(`--- Reviewer: ${reviewer} — ${new Date(r.created_at).toLocaleDateString()}`);
    parts.push(
      `Overall ${formatScore(r.score_overall)} | Relevance ${formatScore(r.score_relevance)} | Depth ${formatScore(r.score_technical_depth)} | Clarity ${formatScore(r.score_clarity)} | Originality ${formatScore(r.score_diversity)}`
    );
    if (r.private_notes) parts.push(`Private notes: ${r.private_notes}`);
    if (r.feedback_to_speaker) parts.push(`Feedback to speaker: ${r.feedback_to_speaker}`);
    parts.push('');
  }
  return parts.join('\n').trimEnd();
}

function SubmissionFeedbackCard({
  submission,
  onOpenSubmission,
  loadingSubmissionId,
}: {
  submission: SpeakerFeedbackSubmission;
  onOpenSubmission?: (submissionId: string) => void;
  loadingSubmissionId?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLoading = loadingSubmissionId === submission.id;

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left cursor-pointer"
        >
          <ChevronRight
            className={`mt-1 h-4 w-4 shrink-0 text-gray-500 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-black sm:text-base break-words">{submission.title}</h4>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={submission.status} />
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 capitalize">
                {submission.submission_type}
              </span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 capitalize">
                {submission.talk_level}
              </span>
              <span className="text-xs text-gray-500">
                {submission.review_count} review{submission.review_count === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <CopyButton getText={() => buildSubmissionScoreText(submission)} label="Copy scores" />
          <CopyButton getText={() => buildSubmissionFeedbackText(submission)} label="Copy all feedback" />
          {onOpenSubmission && (
            <button
              type="button"
              onClick={() => onOpenSubmission(submission.id)}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#e8d95e] disabled:opacity-50 cursor-pointer"
              title="Open submission"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" />
              )}
              Open
            </button>
          )}
        </div>
      </div>

      {/* Aggregate */}
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Aggregate scores</p>
        </div>
        <AggregateRow aggregate={submission.aggregate} reviewCount={submission.review_count} />
      </div>

      {/* Expandable review details */}
      {expanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          {submission.reviews.length === 0 ? (
            <p className="text-sm text-gray-500">No individual reviews on record.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Individual reviews ({submission.reviews.length})
              </p>
              {submission.reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-black">
                        {review.reviewer.name || review.reviewer.email}
                      </p>
                      {review.reviewer.name && (
                        <p className="truncate text-xs text-gray-500">{review.reviewer.email}</p>
                      )}
                    </div>
                    <p className="shrink-0 whitespace-nowrap text-xs text-gray-500">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="mb-3 grid grid-cols-5 gap-1.5 sm:gap-2">
                    {[
                      { label: 'Overall', value: review.score_overall },
                      { label: 'Relevance', value: review.score_relevance },
                      { label: 'Depth', value: review.score_technical_depth },
                      { label: 'Clarity', value: review.score_clarity },
                      { label: 'Originality', value: review.score_diversity },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded bg-gray-50 p-1.5 text-center">
                        <p className="text-[10px] uppercase text-gray-500">{label}</p>
                        <p className={`text-sm font-bold ${scoreColor(value)}`}>{formatScore(value)}</p>
                      </div>
                    ))}
                  </div>

                  {review.private_notes && (
                    <div className="mb-2 rounded-lg border border-yellow-200 bg-yellow-50 p-2.5">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-semibold text-yellow-800">Private notes (committee only)</p>
                        <CopyButton getText={() => review.private_notes || ''} label="Copy" />
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-yellow-900">{review.private_notes}</p>
                    </div>
                  )}

                  {review.feedback_to_speaker && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-semibold text-blue-800">Feedback for speaker</p>
                        <CopyButton getText={() => review.feedback_to_speaker || ''} label="Copy" />
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-blue-900">{review.feedback_to_speaker}</p>
                    </div>
                  )}

                  {!review.private_notes && !review.feedback_to_speaker && (
                    <p className="text-xs italic text-gray-500">Reviewer did not leave written feedback.</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SpeakerFeedbackPanel({
  speakerId,
  speakerName,
  onOpenSubmission,
  loadingSubmissionId,
}: SpeakerFeedbackPanelProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: cfpQueryKeys.speakerFeedback(speakerId),
    queryFn: () => fetchSpeakerFeedback(speakerId),
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-black" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">Failed to load feedback for this speaker.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { submissions, overall } = data;

  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
        <FileText className="mx-auto mb-2 h-8 w-8 text-gray-400" />
        <p className="text-sm font-medium text-black">No submissions from this speaker</p>
        <p className="mt-1 text-xs text-gray-500">There is no committee feedback to show yet.</p>
      </div>
    );
  }

  const summaryText = [
    `Feedback summary — ${speakerName}`,
    `${overall.total_submissions} submission(s), ${overall.total_reviews} review(s)`,
    `Avg overall (across all reviews): ${formatScore(overall.avg_overall)}`,
  ].join('\n');

  return (
    <div className="space-y-4">
      {/* Overall summary */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-black">
              <MessageSquare className="h-4 w-4 text-gray-600" />
              Feedback Overview
            </h4>
            <p className="mt-1 text-xs text-gray-600">
              Aggregate committee feedback for {speakerName}. Click any submission to expand reviewer notes.
            </p>
          </div>
          <CopyButton getText={() => summaryText} label="Copy summary" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:gap-4">
          <div className="rounded-lg bg-white p-2 text-center border border-gray-200">
            <p className="text-[10px] uppercase text-gray-500">Submissions</p>
            <p className="text-lg font-bold text-black sm:text-xl">{overall.total_submissions}</p>
          </div>
          <div className="rounded-lg bg-white p-2 text-center border border-gray-200">
            <p className="text-[10px] uppercase text-gray-500">Total reviews</p>
            <p className="text-lg font-bold text-black sm:text-xl">{overall.total_reviews}</p>
          </div>
          <div className="rounded-lg bg-white p-2 text-center border border-gray-200">
            <p className="text-[10px] uppercase text-gray-500">Avg overall</p>
            <p className={`text-lg font-bold sm:text-xl ${scoreColor(overall.avg_overall)}`}>
              {formatScore(overall.avg_overall)}
            </p>
          </div>
        </div>
      </div>

      {/* Per-submission feedback */}
      <div className="space-y-3">
        {submissions.map((submission) => (
          <SubmissionFeedbackCard
            key={submission.id}
            submission={submission}
            onOpenSubmission={onOpenSubmission}
            loadingSubmissionId={loadingSubmissionId}
          />
        ))}
      </div>
    </div>
  );
}
