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
  SpeakerFeedbackReview,
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

function agreementWord(stddev: number | null): string {
  if (stddev === null) return 'n/a';
  if (stddev < 0.5) return 'aligned';
  if (stddev < 1) return 'some disagreement';
  return 'polarising';
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
 * Structured prompt for ChatGPT/Claude. Tells the model what to do, gives it the
 * full context it needs, and constrains it so it can't fabricate or leak private
 * reviewer notes. The admin just pastes this into the chat.
 */
export function buildAiReplyPrompt(speakerName: string, data: SpeakerFeedbackResponse): string {
  const { overall, submissions } = data;

  const header = [
    'You are helping an admin of the ZurichJS Conference CFP draft a warm, concrete, honest email reply to a speaker who is asking about the committee\'s feedback on their submission(s).',
    '',
    'Rules:',
    '- Use ONLY the data below. Do not invent scores, quotes, or reasoning.',
    '- Do NOT share "Private notes" content with the speaker. Those are internal — let them inform your tone only.',
    '- Refer to "the committee" or "reviewers" — never name individual reviewers.',
    '- If the decision is rejected or waitlisted, be kind but specific about what held it back.',
    '- If accepted, be congratulatory and practical about next steps.',
    '- Reference 2–4 concrete strengths or weaknesses drawn from the feedback to the speaker.',
    '- Invite them to reach out for more detail.',
    '- Target length: 180–300 words. Plain email, no Markdown.',
  ].join('\n');

  const speakerBlock = [
    '',
    'SPEAKER',
    `Name: ${speakerName}`,
    `Across all submissions: ${overall.total_submissions} submission(s), ${overall.total_reviews} review(s), avg Overall ${fmt(overall.avg_overall)}${
      overall.percentile !== null
        ? ` (${pct(overall.percentile)} percentile of ${overall.cohort_size} reviewed talks; reviewed avg ${fmt(overall.cohort_avg)})`
        : ''
    }.`,
  ].join('\n');

  const submissionBlocks = submissions.map((sub, i) => formatSubmissionForPrompt(sub, i + 1)).join('\n\n');

  const footer = '\n\nTASK\nDraft the email now.';

  return [header, speakerBlock, '', submissionBlocks, footer].join('\n');
}

function formatSubmissionForPrompt(sub: SpeakerFeedbackSubmission, index: number): string {
  const a = sub.aggregate;
  const lines: string[] = [];
  lines.push(`SUBMISSION ${index} — "${sub.title}"`);
  lines.push(`Status: ${sub.status}  ·  Type: ${sub.submission_type}  ·  Level: ${sub.talk_level}`);
  if (sub.tags.length > 0) {
    lines.push(`Tags: ${sub.tags.map((t) => t.name).join(', ')}`);
  }
  lines.push(`Abstract: ${sub.abstract}`);
  if (sub.outline) lines.push(`Outline: ${sub.outline}`);
  if (sub.additional_notes) lines.push(`Additional notes from speaker: ${sub.additional_notes}`);

  lines.push('');
  lines.push(
    `Aggregate scores (1–5): Overall ${fmt(a.overall)}, Relevance ${fmt(a.relevance)}, Depth ${fmt(a.technical_depth)}, Clarity ${fmt(a.clarity)}, Originality ${fmt(a.diversity)}`
  );
  lines.push(
    `Coverage: ${sub.review_count} reviewer(s), ${sub.analytics.feedback_written_count} left written feedback`
  );
  if (sub.analytics.percentile !== null) {
    lines.push(
      `Percentile: ${pct(sub.analytics.percentile)} of ${sub.analytics.cohort_size} reviewed talks`
    );
  }
  lines.push(
    `Reviewer agreement: ${agreementWord(sub.analytics.score_stddev)} (scores ${fmt(sub.analytics.score_min)} → ${fmt(sub.analytics.score_max)})`
  );

  if (sub.reviews.length > 0) {
    lines.push('');
    lines.push('Reviews:');
    for (const r of sub.reviews) {
      lines.push(formatReviewForPrompt(r));
    }
  }

  return lines.join('\n');
}

function formatReviewForPrompt(r: SpeakerFeedbackReview): string {
  const lines = [
    `  — Reviewer (${new Date(r.created_at).toLocaleDateString()}): Overall ${fmt(r.score_overall)}, Relevance ${fmt(r.score_relevance)}, Depth ${fmt(r.score_technical_depth)}, Clarity ${fmt(r.score_clarity)}, Originality ${fmt(r.score_diversity)}`,
    `    Feedback to speaker: ${r.feedback_to_speaker || '(none)'}`,
    `    Private notes (internal only — do not share): ${r.private_notes || '(none)'}`,
  ];
  return lines.join('\n');
}
