/**
 * useSessionFeedback — submit ratings from the schedule and remember them.
 *
 * Keeps the browser's submitted-feedback map in state (hydrated from
 * localStorage after mount, so SSR never sees it), posts new ratings to the
 * public API, and treats a 409 "already submitted" from the server as a
 * success — the browser simply forgot, the database didn't.
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

async function postFeedback(input: SubmitSessionFeedbackInput, clientId: string, previewAt: string | null): Promise<void> {
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

  if (res.ok) return;

  let body: FeedbackApiError = {};
  try {
    body = (await res.json()) as FeedbackApiError;
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 409) return; // already stored server-side — same outcome for the visitor
  throw new SessionFeedbackError(body.error ?? 'Could not send your feedback. Please try again.', body.code);
}

export interface UseSessionFeedbackOptions {
  /** Frozen clock for rehearsals; forwarded to the API. See `@/lib/feedback/preview-clock`. */
  previewAt?: string | null;
}

export function useSessionFeedback({ previewAt = null }: UseSessionFeedbackOptions = {}) {
  const [submitted, setSubmitted] = useState<Record<string, StoredSessionFeedback>>({});
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setSubmitted(readSubmittedFeedback());
  }, []);

  const mutation = useMutation({
    mutationFn: async (input: SubmitSessionFeedbackInput) => {
      const clientId = getOrCreateFeedbackClientId();
      if (!clientId) {
        throw new SessionFeedbackError('Your browser is blocking storage, so feedback cannot be sent from here.');
      }
      await postFeedback(input, clientId, previewAt);
      return input;
    },
    onMutate: (input) => {
      setPendingItemId(input.scheduleItemId);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[input.scheduleItemId];
        return next;
      });
    },
    onSuccess: (input) => {
      const entry: StoredSessionFeedback = {
        rating: input.rating,
        comment: input.comment || null,
        submittedAt: new Date().toISOString(),
      };
      setSubmitted(markFeedbackSubmitted(input.scheduleItemId, entry));
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
    onSettled: () => setPendingItemId(null),
  });

  const submit = useCallback(
    async (input: SubmitSessionFeedbackInput) => {
      try {
        await mutation.mutateAsync(input);
      } catch {
        // Surfaced inline through `errors`; nothing to rethrow to the form.
      }
    },
    [mutation]
  );

  return {
    submitted,
    submit,
    pendingItemId,
    errors,
  };
}
