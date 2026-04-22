/**
 * Speaker feedback text builders
 *
 * Pure functions that turn the speaker-feedback API response into text blobs the
 * admin can paste somewhere else: quick text summaries, two LLM prompt variants
 * (short warm reply and detailed reply), and a raw context dump with no
 * instructions so the admin can build their own prompt. No UI, no side effects.
 */

import type {
  SpeakerFeedbackResponse,
  SpeakerFeedbackSubmission,
} from '@/lib/types/cfp-admin';

const SHORTLIST_BAR_CONTEXT =
  'Roughly a 3/5 committee average was the bar to be shortlisted, and even shortlisted talks were not guaranteed acceptance.';

const ANTI_FLUFF_RULES = [
  'Skip opening clichés. No "I hope this finds you well", "I wanted to reach out", "Thank you so much for submitting", "We were thrilled to receive".',
  'Skip closing clichés. No "feel free to reach out", "wishing you continued success", "keep up the great work".',
  'Do not recap the abstract back at the speaker — they wrote it.',
  'Do not write generic praise ("interesting topic", "great effort") or generic advice ("keep iterating", "consider refining"). If you cannot be specific, leave it out.',
  'Never name individual reviewers or expose per-reviewer scores. Synthesize — do not list one reviewer per paragraph.',
  'Use "I" throughout, writing on behalf of the committee. Never "we the committee".',
  'If reviewers disagreed, say that honestly instead of averaging it into mush.',
  'Warmth comes from being specific about what you read, not from adjectives. Cut anything that could appear unchanged in a different speaker\'s email.',
];

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
 * Short & warm draft. Aims for ~120-180 words, no score rubric in the body.
 * Tuned to avoid the "AI thank-you note" tone by giving the model a specific
 * voice (engineer to engineer) and an explicit list of phrases to avoid.
 */
export function buildWarmReplyPrompt(speakerName: string, data: SpeakerFeedbackResponse): string {
  const multi = data.submissions.length > 1;
  const parts: string[] = [];

  parts.push(
    `I'm drafting a short email to ${speakerName}, who submitted to the ZurichJS conference CFP. You are helping me write it. The tone should sound like one engineer to another — not a corporate HR note, not an AI thank-you. A human read their submission and this is that human replying.`
  );
  parts.push('');
  parts.push(`Submission${multi ? 's' : ''} and what the committee said:`);

  data.submissions.forEach((sub, i) => {
    parts.push('');
    if (multi) parts.push(`## Submission ${i + 1} of ${data.submissions.length}`);
    parts.push(formatSubmissionForPrompt(sub, { includeAggregate: false }));
  });

  parts.push('');
  parts.push(`Context on where they landed: ${SHORTLIST_BAR_CONTEXT}`);
  parts.push('');
  parts.push('Draft the email. Target 120-180 words. Two short paragraphs is usually right — one that gets to the outcome, one with one specific strength and (if warranted) one specific thing reviewers wanted more of.');
  parts.push('');
  parts.push('Rules:');
  ANTI_FLUFF_RULES.forEach((rule) => parts.push(`- ${rule}`));
  parts.push('- No rubric scores in the body. This variant keeps it short and human.');

  return parts.join('\n');
}

/**
 * Longer, substantive draft with the rubric in the body. Used when the
 * committee has real qualitative material to convey or when the speaker is
 * likely to want detail (e.g. waitlisted, close call). Same anti-fluff
 * guardrails; more room for synthesis.
 */
export function buildDetailedReplyPrompt(speakerName: string, data: SpeakerFeedbackResponse): string {
  const multi = data.submissions.length > 1;
  const parts: string[] = [];

  parts.push(
    `I'm drafting a thorough feedback email to ${speakerName} about their ZurichJS CFP submission${multi ? 's' : ''}. Several committee members reviewed it independently. The speaker should walk away with specific, actionable feedback grounded in what reviewers actually said — not a generic encouragement letter.`
  );
  parts.push('');
  parts.push(`Speaker: ${speakerName}`);

  data.submissions.forEach((sub, i) => {
    parts.push('');
    if (multi) parts.push(`## Submission ${i + 1} of ${data.submissions.length}`);
    parts.push(formatSubmissionForPrompt(sub, { includeAggregate: true }));
  });

  parts.push('');
  parts.push(`Calibration: ${SHORTLIST_BAR_CONTEXT} Work this in plainly if it helps the speaker read their scores.`);
  parts.push('');
  parts.push('Draft the email. Target 250-350 words. Structure roughly: outcome up front, what reviewers liked (specific), what reviewers wanted more of (specific, synthesized — not one bullet per reviewer), their committee averages on the 1-5 rubric (Overall / Relevance / Technical Depth / Clarity / Originality) with a sentence framing where they were strongest vs weakest, short close.');
  parts.push('');
  parts.push('Rules:');
  ANTI_FLUFF_RULES.forEach((rule) => parts.push(`- ${rule}`));
  parts.push('- Include the five committee averages once. Do not add a score per paragraph.');

  return parts.join('\n');
}

/**
 * All the same data the prompt variants use, but with zero instructions —
 * so the admin can paste it into their own prompt or workflow.
 */
export function buildRawContextDump(speakerName: string, data: SpeakerFeedbackResponse): string {
  const parts: string[] = [];
  const { overall } = data;

  parts.push(`Speaker: ${speakerName}`);
  parts.push(
    `${overall.total_submissions} submission(s), ${overall.total_reviews} review(s), avg overall ${fmt(overall.avg_overall)}${
      overall.percentile !== null ? `, ${pct(overall.percentile)} percentile of ${overall.cohort_size} reviewed` : ''
    }`
  );
  parts.push(`Shortlist bar: ${SHORTLIST_BAR_CONTEXT}`);

  data.submissions.forEach((sub, i) => {
    parts.push('');
    parts.push(`## Submission ${i + 1} of ${data.submissions.length}: "${sub.title}" [${sub.status}]`);
    parts.push(formatSubmissionForPrompt(sub, { includeAggregate: true, includeStatus: false }));
  });

  return parts.join('\n');
}

interface FormatOptions {
  includeAggregate: boolean;
  includeStatus?: boolean;
}

function formatSubmissionForPrompt(
  sub: SpeakerFeedbackSubmission,
  { includeAggregate, includeStatus = true }: FormatOptions
): string {
  const lines: string[] = [];
  lines.push(`Title: ${sub.title}`);
  lines.push(`Type: ${sub.submission_type} · Level: ${sub.talk_level}`);
  if (includeStatus) lines.push(`Decision: ${sub.status}`);
  lines.push('');
  lines.push('Abstract (from the speaker):');
  lines.push(sub.abstract);
  if (sub.outline) {
    lines.push('');
    lines.push('Outline (from the speaker):');
    lines.push(sub.outline);
  }
  if (sub.additional_notes) {
    lines.push('');
    lines.push('Additional notes from the speaker:');
    lines.push(sub.additional_notes);
  }

  if (sub.reviews.length === 0) {
    lines.push('');
    lines.push('No committee reviews on record.');
    return lines.join('\n');
  }

  if (includeAggregate) {
    const a = sub.aggregate;
    lines.push('');
    lines.push(
      `Committee averages across ${sub.reviews.length} review${sub.reviews.length === 1 ? '' : 's'} (1-5): Overall ${fmt(a.overall)} · Relevance ${fmt(a.relevance)} · Technical Depth ${fmt(a.technical_depth)} · Clarity ${fmt(a.clarity)} · Originality ${fmt(a.diversity)}`
    );
  }

  lines.push('');
  lines.push('Committee reviews (anonymized — synthesize, do not attribute):');
  sub.reviews.forEach((r, i) => {
    const notes = [r.feedback_to_speaker, r.private_notes].filter(Boolean).join(' / ');
    lines.push('');
    lines.push(`Reviewer ${i + 1} — scores: Overall ${fmt(r.score_overall)}, Relevance ${fmt(r.score_relevance)}, Depth ${fmt(r.score_technical_depth)}, Clarity ${fmt(r.score_clarity)}, Originality ${fmt(r.score_diversity)}`);
    if (notes) {
      lines.push(`Notes: ${notes}`);
    } else {
      lines.push('Notes: (none written)');
    }
  });

  return lines.join('\n');
}
