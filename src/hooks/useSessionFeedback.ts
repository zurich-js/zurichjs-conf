/**
 * useSessionFeedback — submit ratings from the schedule and remember them.
 *
 * Keeps the browser's submitted-feedback map in state (hydrated from
 * localStorage after mount, so SSR never sees it) and posts new ratings to
 * the public API. A 409 from the server means this browser already rated the
 * session and localStorage simply forgot: the card flips to its submitted
 * state without pretending a new rating was recorded (no analytics, no rating
 * shown, since the original value is unknown here).
 */

import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import { getOrCreateFeedbackClientId, markFeedbackSubmitted, readSubmittedFeedback } from '@/lib/feedback/storage';
import type { StoredSessionFeedback } from '@/lib/feedback/types';

export interface SubmitSessionFeedbackInput {
  scheduleItemId: string;
  sessionId: string | null;
  sessionKind: 'talk' | 'workshop' | 'panel' | null;
  sessionStatus: 'live' | 'past';
  rating: number;
  comment: string;
}

type SubmitOutcome = 'created' | 'already_submitted';

interface FeedbackApiError {
  error?: string;
  code?: 'ALREADY_SUBMITTED' | 'NOT_OPEN' | 'NOT_FOUND';
}

export class SessionFeedbackError extends Error {
  readonly code: FeedbackApiError['code'];

  constructor(message: string, code?: FeedbackApiError['code']) {
    super(message);
    this.name = 'SessionFeedbackError';
    this.code = code;
  }
}

/** POST one rating; resolves with whether it was stored or already existed, throws on any other failure. */
async function postFeedback(
  input: SubmitSessionFeedbackInput,
  clientId: string,
  previewAt: string | null
): Promise<SubmitOutcome> {
  const res = await fetch('/api/feedback/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scheduleItemId: input.scheduleItemId,
      clientId,
      rating: input.rating,
      comment: input.comment || undefined,
      // Only honoured outside production — keeps a rehearsal consistent end to end.
      previewAt: previewAt ?? undefined,
    }),
  });

  if (res.ok) return 'created';

  let body: FeedbackApiError = {};
  try {
    body = (await res.json()) as FeedbackApiError;
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 409 || body.code === 'ALREADY_SUBMITTED') return 'already_submitted';
  throw new SessionFeedbackError(body.error ?? 'Could not send your feedback. Please try again.', body.code);
}

export interface UseSessionFeedbackOptions {
  /** Frozen clock for rehearsals; forwarded to the API. See `@/lib/feedback/preview-clock`. */
  previewAt?: string | null;
}

/** Submitted-feedback map, per-item pending state, inline errors and the `submit` action for schedule cards. */
export function useSessionFeedback({ previewAt = null }: UseSessionFeedbackOptions = {}) {
  const [submitted, setSubmitted] = useState<Record<string, StoredSessionFeedback>>({});
  // Several cards can be in flight at once (rate a talk, scroll, rate another),
  // so pending state is tracked per schedule item rather than as one id.
  const [pendingItemIds, setPendingItemIds] = useState<ReadonlySet<string>>(() => new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setSubmitted(readSubmittedFeedback());
  }, []);

  const mutation = useMutation({
    mutationFn: async (input: SubmitSessionFeedbackInput) => {
      const outcome = await postFeedback(input, getOrCreateFeedbackClientId(), previewAt);
      return { input, outcome };
    },
    onMutate: (input) => {
      setPendingItemIds((prev) => new Set(prev).add(input.scheduleItemId));
      setErrors((prev) => {
        if (!(input.scheduleItemId in prev)) return prev;
        const next = { ...prev };
        delete next[input.scheduleItemId];
        return next;
      });
    },
    onSuccess: ({ input, outcome }) => {
      const entry: StoredSessionFeedback =
        outcome === 'created'
          ? { rating: input.rating, comment: input.comment || null, submittedAt: new Date().toISOString() }
          : { rating: null, comment: null, submittedAt: new Date().toISOString() };
      setSubmitted(markFeedbackSubmitted(input.scheduleItemId, entry));

      if (outcome !== 'created') return;
      analytics.track('session_feedback_submitted', {
        schedule_item_id: input.scheduleItemId,
        session_id: input.sessionId,
        session_kind: input.sessionKind,
        rating: input.rating,
        has_comment: entry.comment !== null,
        session_status: input.sessionStatus,
      } as EventProperties<'session_feedback_submitted'>);
    },
    onError: (error, input) => {
      const message = error instanceof Error && error.message ? error.message : 'Could not send your feedback. Please try again.';
      setErrors((prev) => ({ ...prev, [input.scheduleItemId]: message }));
    },
    onSettled: (_data, _error, input) => {
      setPendingItemIds((prev) => {
        if (!prev.has(input.scheduleItemId)) return prev;
        const next = new Set(prev);
        next.delete(input.scheduleItemId);
        return next;
      });
    },
  });

  const submit = useCallback(
    async (input: SubmitSessionFeedbackInput) => {
      if (pendingItemIds.has(input.scheduleItemId)) return;
      try {
        await mutation.mutateAsync(input);
      } catch {
        // Surfaced inline through `errors`; nothing to rethrow to the form.
      }
    },
    [mutation, pendingItemIds]
  );

  return {
    submitted,
    submit,
    pendingItemIds,
    errors,
  };
}
