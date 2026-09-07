/**
 * Client-side calls to the public session feedback API.
 *
 * Kept out of the hook so the hook is only TanStack Query coordination and
 * this module owns the wire format and the mapping of HTTP outcomes.
 */

import type { SubmitSessionFeedbackInput } from '@/lib/types/session-feedback';

/** `created` when a new row was stored; `already_submitted` when this browser had rated the session before. */
export type SubmitSessionFeedbackOutcome = 'created' | 'already_submitted';

export type SessionFeedbackErrorCode = 'ALREADY_SUBMITTED' | 'NOT_OPEN' | 'NOT_FOUND';

interface FeedbackApiErrorBody {
  error?: string;
  code?: SessionFeedbackErrorCode;
}

/** A non-duplicate failure from the feedback API, carrying its machine-readable code when it sent one. */
export class SessionFeedbackError extends Error {
  readonly code: SessionFeedbackErrorCode | undefined;

  constructor(message: string, code?: SessionFeedbackErrorCode) {
    super(message);
    this.name = 'SessionFeedbackError';
    this.code = code;
  }
}

const DEFAULT_ERROR = 'Could not send your feedback. Please try again.';

/**
 * POST one rating. Resolves with whether it was stored or already existed;
 * throws `SessionFeedbackError` on any other failure.
 *
 * `previewAt` is the rehearsal clock (see `@/lib/feedback/preview-clock`); it
 * is only honoured by non-production deployments.
 */
export async function postSessionFeedback(
  input: SubmitSessionFeedbackInput,
  clientId: string,
  previewAt: string | null
): Promise<SubmitSessionFeedbackOutcome> {
  const res = await fetch('/api/feedback/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scheduleItemId: input.scheduleItemId,
      clientId,
      rating: input.rating,
      comment: input.comment || undefined,
      previewAt: previewAt ?? undefined,
    }),
  });

  if (res.ok) return 'created';

  let body: FeedbackApiErrorBody = {};
  try {
    body = (await res.json()) as FeedbackApiErrorBody;
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 409 || body.code === 'ALREADY_SUBMITTED') return 'already_submitted';
  throw new SessionFeedbackError(body.error ?? DEFAULT_ERROR, body.code);
}
