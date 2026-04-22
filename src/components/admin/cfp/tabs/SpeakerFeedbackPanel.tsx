/**
 * Speaker Feedback Panel
 * Unified view of all committee feedback across a speaker's submissions plus analytics
 * (percentile, tag overlap, reviewer coverage, past-talk media).
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
  TrendingUp,
  Users,
  PenLine,
  Tag,
  Info,
} from 'lucide-react';
import {
  cfpQueryKeys,
  type SpeakerFeedbackSubmission,
  type SpeakerFeedbackAggregate,
  type SpeakerFeedbackSubmissionAnalytics,
  type SpeakerFeedbackTagStat,
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

function formatPercent(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(0)}%`;
}

function scoreColor(value: number | null): string {
  if (value === null) return 'text-gray-400';
  if (value >= 4) return 'text-green-600';
  if (value >= 3) return 'text-yellow-600';
  return 'text-red-600';
}

function percentileColor(value: number | null): string {
  if (value === null) return 'text-gray-400 bg-gray-50 border-gray-200';
  if (value >= 75) return 'text-green-700 bg-green-50 border-green-200';
  if (value >= 50) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-red-700 bg-red-50 border-red-200';
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

function MediaLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Video;
}) {
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

function TagChip({ tag }: { tag: SpeakerFeedbackTagStat }) {
  const others = Math.max(0, tag.submission_count - 1);
  const competitive = others >= 5;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        competitive
          ? 'border-orange-200 bg-orange-50 text-orange-800'
          : 'border-gray-200 bg-gray-50 text-gray-700'
      }`}
      title={
        others === 0
          ? 'No other submissions use this tag'
          : `${others} other submission${others === 1 ? '' : 's'} share this topic`
      }
    >
      <Tag className="h-2.5 w-2.5" />
      {tag.name}
      <span className="text-gray-500">· {others}</span>
    </span>
  );
}

function AnalyticsRow({
  analytics,
  reviewCount,
}: {
  analytics: SpeakerFeedbackSubmissionAnalytics;
  reviewCount: number;
}) {
  const percentileLabel = analytics.percentile === null
    ? 'n/a'
    : `Top ${Math.max(1, 100 - Math.round(analytics.percentile))}%`;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div
        className={`rounded-lg border p-2 text-center ${percentileColor(analytics.percentile)}`}
        title={`This submission's mean Overall score ranks above ${formatPercent(analytics.percentile)} of the ${analytics.cohort_size} cohort submissions. Higher is better. 75%+ = strong, 50–75% = middle of pack, under 50% = bottom half.`}
      >
        <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide">
          <TrendingUp className="h-3 w-3" />
          Percentile
        </p>
        <p className="text-sm font-bold">{formatPercent(analytics.percentile)}</p>
        <p className="text-[10px] opacity-80">{percentileLabel}</p>
      </div>
      <div
        className="rounded-lg border border-gray-200 bg-white p-2 text-center"
        title={`${reviewCount} reviewer${reviewCount === 1 ? '' : 's'} scored this submission. The cohort contains ${analytics.cohort_size} submissions for comparison. Low review counts mean a weaker signal.`}
      >
        <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-gray-500">
          <Users className="h-3 w-3" />
          Reviews
        </p>
        <p className="text-sm font-bold text-black">{reviewCount}</p>
        <p className="text-[10px] text-gray-500">
          of {analytics.cohort_size || '—'} in cohort
        </p>
      </div>
      <div
        className="rounded-lg border border-gray-200 bg-white p-2 text-center"
        title="Lowest–highest Overall score from any reviewer. σ is the standard deviation — a small σ means reviewers agreed, a large σ means the submission was polarising and is worth a closer look before acting on the average."
      >
        <p className="text-[10px] uppercase tracking-wide text-gray-500">Spread</p>
        <p className="text-sm font-bold text-black">
          {analytics.score_min !== null && analytics.score_max !== null
            ? `${formatScore(analytics.score_min)}–${formatScore(analytics.score_max)}`
            : '—'}
        </p>
        <p className="text-[10px] text-gray-500">
          σ {analytics.score_stddev !== null ? analytics.score_stddev.toFixed(2) : '—'}
        </p>
      </div>
      <div
        className="rounded-lg border border-gray-200 bg-white p-2 text-center"
        title={`${analytics.feedback_written_count} of ${reviewCount} reviewer${reviewCount === 1 ? '' : 's'} left written notes or feedback (not just scores). Low coverage means you have less qualitative signal to explain the outcome.`}
      >
        <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-gray-500">
          <PenLine className="h-3 w-3" />
          Written
        </p>
        <p className="text-sm font-bold text-black">
          {analytics.feedback_written_count}/{reviewCount}
        </p>
        <p className="text-[10px] text-gray-500">{formatPercent(analytics.feedback_written_percent)} of reviewers</p>
      </div>
    </div>
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
  if (sub.analytics.percentile !== null) {
    lines.push(`Percentile: ${formatPercent(sub.analytics.percentile)} of ${sub.analytics.cohort_size} submissions`);
  }
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

  const hasMedia = Boolean(submission.slides_url || submission.previous_recording_url);
  const hasNotes = Boolean(submission.outline || submission.additional_notes);

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

      {/* Body */}
      <div className="space-y-3 p-4">
        {/* Media & tags row */}
        {(hasMedia || submission.tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-2">
            {submission.previous_recording_url && (
              <MediaLink href={submission.previous_recording_url} label="Recording" icon={Video} />
            )}
            {submission.slides_url && (
              <MediaLink href={submission.slides_url} label="Slides" icon={Presentation} />
            )}
            {submission.tags.map((tag) => (
              <TagChip key={tag.id} tag={tag} />
            ))}
          </div>
        )}

        {/* Aggregate scores */}
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Aggregate scores
          </p>
          <AggregateRow aggregate={submission.aggregate} reviewCount={submission.review_count} />
        </div>

        {/* Analytics */}
        {submission.review_count > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Analytics
            </p>
            <AnalyticsRow analytics={submission.analytics} reviewCount={submission.review_count} />
          </div>
        )}
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="space-y-4 border-t border-gray-200 bg-gray-50 p-4">
          {/* Speaker-provided context */}
          {hasNotes && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Speaker-provided context
              </p>
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

          {/* Reviews */}
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

function AnalyticsHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-black hover:bg-gray-50 cursor-pointer"
      >
        <Info className="h-3 w-3" />
        {open ? 'Hide help' : 'How to read these'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
          <p>
            <strong className="text-black">Cohort</strong> = every CFP submission that has reached
            the review pool this year (i.e. status is <em>submitted</em>, <em>under review</em>,{' '}
            <em>shortlisted</em>, <em>accepted</em>, <em>rejected</em>, or <em>waitlisted</em>).
            Drafts and withdrawn entries are excluded because they carry no committee signal.
            Numbers like <em>n = 42</em> refer to how many cohort submissions contributed to the
            comparison.
          </p>
          <p>
            <strong className="text-black">Percentile</strong> shows where this submission&apos;s
            <em> average Overall score </em>sits compared to the rest of the cohort.{' '}
            <em>80%</em> means the submission scored higher than 80% of the cohort. Ties are split
            in half. Higher is better — the badge colours green at <em>≥75%</em>, yellow at{' '}
            <em>≥50%</em>, red below that. It&apos;s a ranking, not a quality score — a 60th
            percentile in a strong year still means the talk is above average.
          </p>
          <p>
            <strong className="text-black">Spread &amp; σ</strong> describe how much the reviewers{' '}
            <em>disagreed</em> on this submission. <em>Spread</em> is the lowest Overall score
            paired with the highest. <em>σ</em> (standard deviation) is the single-number version —
            small σ = reviewers agreed, large σ = polarising. A great talk with everyone at 4 looks
            very different from a 2–5 split even if the average is the same; the split deserves a
            closer read.
          </p>
          <p>
            <strong className="text-black">Reviews</strong> shows how many reviewers covered this
            submission (and what share of the reviewer pool that represents).{' '}
            <strong className="text-black">Written</strong> shows how many of those reviewers
            actually left a note — low coverage or low written share weakens the signal and is worth
            flagging before sharing feedback with the speaker.
          </p>
          <p>
            <strong className="text-black">Tag chips</strong> show the topic plus{' '}
            <em>how many other submissions</em> share that tag. Chips turn orange when ≥5 other
            submissions compete on the same topic — useful context when explaining why a good talk
            didn&apos;t make the cut.
          </p>
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
    overall.percentile !== null
      ? `Speaker percentile: ${formatPercent(overall.percentile)} of ${overall.cohort_size} submissions`
      : null,
    overall.cohort_avg !== null ? `Cohort avg: ${formatScore(overall.cohort_avg)}` : null,
  ]
    .filter(Boolean)
    .join('\n');

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
          <div className="flex items-center gap-2">
            <AnalyticsHelp />
            <CopyButton getText={() => summaryText} label="Copy summary" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
          <div
            className="rounded-lg bg-white p-2 text-center border border-gray-200"
            title="Number of CFP submissions this speaker has in the system"
          >
            <p className="text-[10px] uppercase text-gray-500">Submissions</p>
            <p className="text-lg font-bold text-black sm:text-xl">{overall.total_submissions}</p>
          </div>
          <div
            className="rounded-lg bg-white p-2 text-center border border-gray-200"
            title="Committee reviews written across all of this speaker's submissions"
          >
            <p className="text-[10px] uppercase text-gray-500">Total reviews</p>
            <p className="text-lg font-bold text-black sm:text-xl">{overall.total_reviews}</p>
          </div>
          <div
            className="rounded-lg bg-white p-2 text-center border border-gray-200"
            title="Mean Overall score across every review the speaker received (1–5 scale)"
          >
            <p className="text-[10px] uppercase text-gray-500">Avg overall</p>
            <p className={`text-lg font-bold sm:text-xl ${scoreColor(overall.avg_overall)}`}>
              {formatScore(overall.avg_overall)}
            </p>
          </div>
          <div
            className={`rounded-lg border p-2 text-center ${percentileColor(overall.percentile)}`}
            title="Where this speaker's mean Overall score ranks among all cohort submissions. Higher is better."
          >
            <p className="text-[10px] uppercase">Percentile</p>
            <p className="text-lg font-bold sm:text-xl">{formatPercent(overall.percentile)}</p>
          </div>
          <div
            className="rounded-lg bg-white p-2 text-center border border-gray-200"
            title="Mean Overall score of the whole cohort — all CFP submissions currently in the review pool (drafts and withdrawn excluded)"
          >
            <p className="text-[10px] uppercase text-gray-500">Cohort avg</p>
            <p className={`text-lg font-bold sm:text-xl ${scoreColor(overall.cohort_avg)}`}>
              {formatScore(overall.cohort_avg)}
            </p>
            <p className="text-[10px] text-gray-500">n = {overall.cohort_size}</p>
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
