/**
 * Speaker Feedback Panel
 * Admin view of all committee feedback across a speaker's submissions, with
 * per-submission analytics (percentile vs. reviewed cohort, reviewer agreement,
 * coverage) and one-click "copy context for an AI" shortcut for drafting replies.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  FileText,
  MessageSquare,
  Video,
  Presentation,
  PenLine,
  Tag,
  Info,
  Sparkles,
} from 'lucide-react';
import {
  cfpQueryKeys,
  type SpeakerFeedbackSubmission,
  type SpeakerFeedbackSubmissionAnalytics,
} from '@/lib/types/cfp-admin';
import { fetchSpeakerFeedback } from '@/lib/cfp/adminApi';
import { StatusBadge } from '../StatusBadge';
import {
  buildDetailedReplyPrompt,
  buildPlainSummary,
  buildRawContextDump,
  buildSubmissionFullFeedback,
  buildSubmissionScores,
  buildWarmReplyPrompt,
} from './speakerFeedbackPrompts';

interface SpeakerFeedbackPanelProps {
  speakerId: string;
  speakerName: string;
  onOpenSubmission?: (submissionId: string) => void;
  loadingSubmissionId?: string | null;
}

function formatScore(value: number | null): string {
  if (value === null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function formatPercent(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(0)}%`;
}

function scoreColor(value: number | null): string {
  if (value === null) return 'text-gray-400';
  if (value >= 4) return 'text-green-600';
  if (value >= 3) return 'text-yellow-600';
  return 'text-red-600';
}

function percentileTone(value: number | null): string {
  if (value === null) return 'text-brand-gray-medium';
  if (value >= 75) return 'text-green-700';
  if (value >= 50) return 'text-yellow-700';
  return 'text-red-700';
}

function agreementLabel(stddev: number | null): { label: string; tone: string } {
  if (stddev === null) return { label: '—', tone: 'text-brand-gray-medium' };
  if (stddev < 0.5) return { label: 'Aligned', tone: 'text-green-600' };
  if (stddev < 1) return { label: 'Some disagreement', tone: 'text-yellow-600' };
  return { label: 'Polarising', tone: 'text-red-600' };
}

function CopyButton({
  getText,
  label,
  icon: Icon = Copy,
  variant = 'default',
}: {
  getText: () => string;
  label: string;
  icon?: typeof Copy;
  variant?: 'default' | 'primary';
}) {
  const [copied, setCopied] = useState(false);
  const base =
    variant === 'primary'
      ? 'bg-brand-primary hover:bg-[#e8d95e] text-black'
      : 'border border-gray-300 bg-white text-black hover:bg-gray-50';

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
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${base}`}
      title={label}
    >
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Icon className="h-3 w-3" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function HelpToggle() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-black hover:bg-gray-50 cursor-pointer"
      >
        <Info className="h-3 w-3" />
        {open ? 'Hide help' : 'How to read'}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 sm:absolute sm:right-0 sm:z-10 sm:mt-1 sm:w-80 sm:shadow-lg">
          <p>
            <strong className="text-black">Percentile</strong> — rank vs. other reviewed talks.
            80% = better than 80% of them. Green ≥75, yellow ≥50, red below.
          </p>
          <p>
            <strong className="text-black">Agreement</strong> — did reviewers agree? Aligned = within
            ~0.5. Polarising = big split, read individual reviews.
          </p>
          <p>
            <strong className="text-black">Written</strong> — reviewers who left notes vs. just scored. Low = weaker qualitative signal.
          </p>
          <p>
            <strong className="text-black">Tags</strong> — topic + how many other talks share it. Orange at 5+ competitors.
          </p>
          <p className="text-[11px] text-brand-gray-medium">
            &quot;Reviewed&quot; = talks with at least one reviewer score. Drafts and withdrawn submissions are excluded.
          </p>
        </div>
      )}
    </div>
  );
}

function AnalyticsRow({ analytics, reviewCount }: { analytics: SpeakerFeedbackSubmissionAnalytics; reviewCount: number }) {
  const agreement = agreementLabel(analytics.score_stddev);
  const range =
    analytics.score_min !== null && analytics.score_max !== null
      ? `${formatScore(analytics.score_min)} → ${formatScore(analytics.score_max)}`
      : '—';

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <div
        className="rounded-lg border border-gray-200 bg-white p-2 text-center"
        title={`Ranks above ${formatPercent(analytics.percentile)} of ${analytics.cohort_size} reviewed talks.`}
      >
        <p className="text-[10px] uppercase tracking-wide text-brand-gray-medium">Percentile</p>
        <p className={`text-sm font-bold ${percentileTone(analytics.percentile)}`}>
          {formatPercent(analytics.percentile)}
        </p>
      </div>
      <div
        className="rounded-lg border border-gray-200 bg-white p-2 text-center"
        title="Aligned = reviewers agreed within ~0.5. Polarising = big split, read individual reviews."
      >
        <p className="text-[10px] uppercase tracking-wide text-brand-gray-medium">Agreement</p>
        <p className={`text-sm font-bold ${agreement.tone}`}>{agreement.label}</p>
        <p className="text-[10px] text-brand-gray-medium">scores {range}</p>
      </div>
      <div
        className="col-span-2 rounded-lg border border-gray-200 bg-white p-2 text-center sm:col-span-1"
        title={`${analytics.feedback_written_count} of ${reviewCount} reviewer${reviewCount === 1 ? '' : 's'} left written notes.`}
      >
        <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-brand-gray-medium">
          <PenLine className="h-3 w-3" />
          Written
        </p>
        <p className="text-sm font-bold text-black">
          {analytics.feedback_written_count}/{reviewCount}
        </p>
      </div>
    </div>
  );
}

function SubmissionCard({
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
      <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-start sm:justify-between">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-start gap-2 text-left cursor-pointer"
        >
          <ChevronRight
            className={`mt-1 h-4 w-4 shrink-0 text-brand-gray-medium transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
          <div className="min-w-0 flex-1">
            <h4 className="break-words text-sm font-semibold text-black sm:text-base">{submission.title}</h4>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StatusBadge status={submission.status} />
              <span className="rounded bg-text-brand-gray-lightest px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                {submission.submission_type}
              </span>
              <span className="rounded bg-text-brand-gray-lightest px-2 py-0.5 text-xs font-medium capitalize text-gray-700">
                {submission.talk_level}
              </span>
              <span className="text-xs text-brand-gray-medium">
                {submission.review_count} review{submission.review_count === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <CopyButton getText={() => buildSubmissionScores(submission)} label="Copy scores" />
          <CopyButton getText={() => buildSubmissionFullFeedback(submission)} label="Copy feedback" />
          {onOpenSubmission && (
            <button
              type="button"
              onClick={() => onOpenSubmission(submission.id)}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-md bg-brand-primary px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#e8d95e] disabled:opacity-50 cursor-pointer"
              title="Open submission"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              Open
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <MediaAndTags submission={submission} />
        <AggregateScores submission={submission} />
        {submission.review_count > 0 && (
          <AnalyticsRow analytics={submission.analytics} reviewCount={submission.review_count} />
        )}
      </div>

      {expanded && <ExpandedDetails submission={submission} />}
    </div>
  );
}

function MediaAndTags({ submission }: { submission: SpeakerFeedbackSubmission }) {
  const hasMedia = Boolean(submission.slides_url || submission.previous_recording_url);
  if (!hasMedia && submission.tags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {submission.previous_recording_url && (
        <MediaLink href={submission.previous_recording_url} icon={Video} label="Recording" />
      )}
      {submission.slides_url && <MediaLink href={submission.slides_url} icon={Presentation} label="Slides" />}
      {submission.tags.map((tag) => {
        const others = Math.max(0, tag.submission_count - 1);
        const competitive = others >= 5;
        return (
          <span
            key={tag.id}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              competitive
                ? 'border-orange-200 bg-orange-50 text-orange-800'
                : 'border-gray-200 bg-gray-50 text-gray-700'
            }`}
            title={others === 0 ? 'No other talks use this tag' : `${others} other talk${others === 1 ? '' : 's'} share this topic`}
          >
            <Tag className="h-2.5 w-2.5" />
            {tag.name}
            <span className="text-brand-gray-medium">· {others}</span>
          </span>
        );
      })}
    </div>
  );
}

function MediaLink({ href, icon: Icon, label }: { href: string; icon: typeof Video; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-black hover:bg-gray-50 cursor-pointer"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <ExternalLink className="h-3 w-3 text-gray-400" />
    </a>
  );
}

function AggregateScores({ submission }: { submission: SpeakerFeedbackSubmission }) {
  if (submission.review_count === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3 text-center">
        <p className="text-sm text-brand-gray-medium">No reviews yet for this submission</p>
      </div>
    );
  }
  const cells = [
    { label: 'Overall', value: submission.aggregate.overall },
    { label: 'Relevance', value: submission.aggregate.relevance },
    { label: 'Depth', value: submission.aggregate.technical_depth },
    { label: 'Clarity', value: submission.aggregate.clarity },
    { label: 'Originality', value: submission.aggregate.diversity },
  ];
  return (
    <div className="grid grid-cols-5 gap-1.5 rounded-lg border border-gray-200 bg-white p-2 sm:gap-2 sm:p-3">
      {cells.map(({ label, value }) => (
        <div key={label} className="text-center">
          <p className="text-[10px] uppercase tracking-wide text-brand-gray-medium">{label}</p>
          <p className={`text-base font-bold sm:text-lg ${scoreColor(value)}`}>{formatScore(value)}</p>
        </div>
      ))}
    </div>
  );
}

function ExpandedDetails({ submission }: { submission: SpeakerFeedbackSubmission }) {
  const hasNotes = Boolean(submission.outline || submission.additional_notes);

  return (
    <div className="space-y-4 border-t border-gray-200 bg-gray-50 p-4">
      {hasNotes && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-gray-medium">Speaker-provided context</p>
          {submission.outline && (
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="mb-1 text-xs font-semibold text-black">Outline</p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{submission.outline}</p>
            </div>
          )}
          {submission.additional_notes && (
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="mb-1 text-xs font-semibold text-black">Additional notes</p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{submission.additional_notes}</p>
            </div>
          )}
        </div>
      )}

      {submission.reviews.length === 0 ? (
        <p className="text-sm text-brand-gray-medium">No individual reviews on record.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-gray-medium">
            Individual reviews ({submission.reviews.length})
          </p>
          {submission.reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-black">
                    {review.reviewer.name || review.reviewer.email}
                  </p>
                  {review.reviewer.name && <p className="truncate text-xs text-brand-gray-medium">{review.reviewer.email}</p>}
                </div>
                <p className="shrink-0 whitespace-nowrap text-xs text-brand-gray-medium">
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
                    <p className="text-[10px] uppercase text-brand-gray-medium">{label}</p>
                    <p className={`text-sm font-bold ${scoreColor(value)}`}>{formatScore(value)}</p>
                  </div>
                ))}
              </div>

              {review.feedback_to_speaker && (
                <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                  <p className="mb-1 text-xs font-semibold text-blue-800">Feedback for speaker</p>
                  <p className="whitespace-pre-wrap text-sm text-blue-900">{review.feedback_to_speaker}</p>
                </div>
              )}
              {review.private_notes && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-2.5">
                  <p className="mb-1 text-xs font-semibold text-yellow-800">Private notes (committee only)</p>
                  <p className="whitespace-pre-wrap text-sm text-yellow-900">{review.private_notes}</p>
                </div>
              )}
              {!review.feedback_to_speaker && !review.private_notes && (
                <p className="text-xs italic text-brand-gray-medium">Reviewer did not leave written feedback.</p>
              )}
            </div>
          ))}
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
        <p className="mt-1 text-xs text-brand-gray-medium">There is no committee feedback to show yet.</p>
      </div>
    );
  }

  const subWord = overall.total_submissions === 1 ? 'submission' : 'submissions';
  const revWord = overall.total_reviews === 1 ? 'review' : 'reviews';

  return (
    <div className="space-y-4">
      {/* Slim summary + primary actions */}
      <div className="rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-black">
              <MessageSquare className="h-4 w-4 text-gray-600" />
              Feedback for {speakerName}
            </h4>
            <p className="mt-1 text-xs text-gray-600">
              <span className="font-semibold text-black">{overall.total_submissions}</span> {subWord} ·{' '}
              <span className="font-semibold text-black">{overall.total_reviews}</span> {revWord} · avg{' '}
              <span className={`font-semibold ${scoreColor(overall.avg_overall)}`}>
                {formatScore(overall.avg_overall)}
              </span>
              {overall.percentile !== null && (
                <>
                  {' · '}
                  <span className={`font-semibold ${percentileTone(overall.percentile)}`}>
                    {formatPercent(overall.percentile)}
                  </span>{' '}
                  percentile of {overall.cohort_size} reviewed
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton
              getText={() => buildWarmReplyPrompt(speakerName, data)}
              label="Warm reply prompt"
              icon={Sparkles}
              variant="primary"
            />
            <CopyButton
              getText={() => buildDetailedReplyPrompt(speakerName, data)}
              label="Detailed reply prompt"
              icon={Sparkles}
              variant="primary"
            />
            <CopyButton
              getText={() => buildRawContextDump(speakerName, data)}
              label="Copy raw context"
              icon={FileText}
            />
            <CopyButton getText={() => buildPlainSummary(speakerName, data)} label="Copy summary" />
            <HelpToggle />
          </div>
        </div>
      </div>

      {/* Per-submission */}
      <div className="space-y-3">
        {submissions.map((submission) => (
          <SubmissionCard
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
