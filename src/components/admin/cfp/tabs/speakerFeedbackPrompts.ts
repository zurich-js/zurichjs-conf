/**
 * Speaker feedback text builders
 *
 * Pure functions that turn the speaker-feedback API response into text blobs the
 * admin can paste somewhere else: a short plain-text summary, a single-submission
 * feedback dump, and a structured prompt for ChatGPT that lets the admin draft a
 * reply to the speaker. No UI, no side effects.
 */

import type {
  SpeakerFeedbackResponse,
  SpeakerFeedbackSubmission,
} from '@/lib/types/cfp-admin';

function fmt(value: number | null): string {
  if (value === null) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function pct(value: number | null): string {
  if (value === null) return '—';
  return `${value.toFixed(0)}%`;
}

export function buildPlainSummary(speakerName: string, data: SpeakerFeedbackResponse): string {
  const { overall } = data;
  const lines = [
    `Feedback summary — ${speakerName}`,
    `${overall.total_submissions} submission(s), ${overall.total_reviews} review(s)`,
    `Avg Overall: ${fmt(overall.avg_overall)}`,
  ];
  if (overall.percentile !== null) {
    lines.push(`Percentile: ${pct(overall.percentile)} of ${overall.cohort_size} reviewed talks`);
  }
  return lines.join('\n');
}

export function buildSubmissionScores(sub: SpeakerFeedbackSubmission): string {
  const a = sub.aggregate;
  const lines = [
    `"${sub.title}" (${sub.status})`,
    `${sub.review_count} review(s)`,
    `Overall ${fmt(a.overall)} · Relevance ${fmt(a.relevance)} · Depth ${fmt(a.technical_depth)} · Clarity ${fmt(a.clarity)} · Originality ${fmt(a.diversity)}`,
  ];
  if (sub.analytics.percentile !== null) {
    lines.push(`Percentile: ${pct(sub.analytics.percentile)} of ${sub.analytics.cohort_size} reviewed`);
  }
  return lines.join('\n');
}

export function buildSubmissionFullFeedback(sub: SpeakerFeedbackSubmission): string {
  const parts = [buildSubmissionScores(sub), ''];
  if (sub.reviews.length === 0) {
    parts.push('(No reviews yet)');
    return parts.join('\n').trimEnd();
  }
  for (const r of sub.reviews) {
    const reviewer = r.reviewer.name || r.reviewer.email;
    parts.push(`— ${reviewer} (${new Date(r.created_at).toLocaleDateString()})`);
    parts.push(
      `  Overall ${fmt(r.score_overall)} · Relevance ${fmt(r.score_relevance)} · Depth ${fmt(r.score_technical_depth)} · Clarity ${fmt(r.score_clarity)} · Originality ${fmt(r.score_diversity)}`
    );
    if (r.feedback_to_speaker) parts.push(`  Feedback to speaker: ${r.feedback_to_speaker}`);
    if (r.private_notes) parts.push(`  Private notes: ${r.private_notes}`);
    parts.push('');
  }
  return parts.join('\n').trimEnd();
}

/**
 * Structured prompt for ChatGPT/Claude. The prompt style is tuned for outputs
 * that synthesize recurring themes across reviews rather than listing each
 * review separately — that's the style that produces useful, personal replies.
 * The admin just pastes this into the chat and gets a draft back.
 */
export function buildAiReplyPrompt(speakerName: string, data: SpeakerFeedbackResponse): string {
  const parts: string[] = [];
  const multi = data.submissions.length > 1;

  parts.push(
    `I need to write a personalized, constructive feedback email to send to a conference speaker about their CFP submission${multi ? 's' : ''}. I'm writing this on behalf of the review committee.`
  );
  parts.push('');
  parts.push(`Speaker: ${speakerName}`);

  data.submissions.forEach((sub, i) => {
    parts.push('');
    if (multi) parts.push(`--- Submission ${i + 1} of ${data.submissions.length} ---`);
    parts.push(formatSubmissionForPrompt(sub));
  });

  parts.push('');
  parts.push(`Write a 2-3 paragraph feedback email${multi ? ' covering all the submissions above' : ''} that:`);
  parts.push('- Thanks them for submitting');
  parts.push('- Highlights what reviewers liked (find the recurring positives across reviews)');
  parts.push("- Gives constructive suggestions (synthesize recurring concerns into a clear theme — don't list each reviewer's point separately)");
  parts.push('- Is encouraging regardless of acceptance/rejection');
  parts.push('- Does NOT reveal individual reviewer identities or exact scores');
  parts.push('- Is written from "I" on behalf of the committee (not "we the committee")');
  parts.push('- Feels personal, not templated');

  return parts.join('\n');
}

function formatSubmissionForPrompt(sub: SpeakerFeedbackSubmission): string {
  const lines: string[] = [];
  lines.push(`Talk title: ${sub.title}`);
  lines.push(`Talk type: ${sub.submission_type} (${sub.talk_level})`);
  lines.push(`Abstract: ${sub.abstract}`);
  if (sub.outline) lines.push(`Outline: ${sub.outline}`);
  if (sub.additional_notes) lines.push(`Additional notes from speaker: ${sub.additional_notes}`);

  if (sub.reviews.length === 0) {
    lines.push('');
    lines.push('No committee reviews yet.');
    return lines.join('\n');
  }

  lines.push('');
  lines.push(`${sub.reviews.length} committee review${sub.reviews.length === 1 ? '' : 's'}:`);

  sub.reviews.forEach((r, i) => {
    lines.push('');
    lines.push(`Review ${i + 1}:`);
    lines.push(
      `Scores: Overall: ${fmt(r.score_overall)}/5, Relevance: ${fmt(r.score_relevance)}/5, Technical Depth: ${fmt(r.score_technical_depth)}/5, Clarity: ${fmt(r.score_clarity)}/5, Originality: ${fmt(r.score_diversity)}/5`
    );
    const notes = [r.feedback_to_speaker, r.private_notes].filter(Boolean).join(' ');
    if (notes) lines.push(`Committee notes: ${notes}`);
  });

  return lines.join('\n');
}
