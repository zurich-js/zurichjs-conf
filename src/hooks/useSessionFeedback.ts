/**
 * useSessionFeedback — submit ratings from the schedule and remember them.
 *
 * Keeps the browser's submitted-feedback map in state (hydrated from
 * localStorage after mount, so SSR never sees it) and coordinates the
 * mutation. The wire call lives in `@/lib/feedback/api`. A duplicate outcome
 * (this browser already rated the session; localStorage simply forgot) flips
 * the card to its submitted state without pretending a new rating was
 * recorded: no analytics, no rating shown, since the original is unknown here.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { analytics } from '@/lib/analytics/client';
import type { EventProperties } from '@/lib/analytics/events';
import { postSessionFeedback } from '@/lib/feedback/api';
import { getOrCreateFeedbackClientId, markFeedbackSubmitted, readSubmittedFeedback } from '@/lib/feedback/storage';
import type { StoredSessionFeedback, SubmitSessionFeedbackInput } from '@/lib/types/session-feedback';

export type { SubmitSessionFeedbackInput } from '@/lib/types/session-feedback';

export interface UseSessionFeedbackOptions {
  /** Frozen clock for rehearsals; forwarded to the API. See `@/lib/feedback/preview-clock`. */
  previewAt?: string | null;
}

export interface UseSessionFeedbackResult {
  /** Submissions this browser has made, keyed by schedule item id. */
  submitted: Record<string, StoredSessionFeedback>;
  /** Send one rating; resolves once the card state has been updated (errors surface via `errors`). */
  submit: (input: SubmitSessionFeedbackInput) => Promise<void>;
  /** Schedule items with a submission in flight. */
  pendingItemIds: ReadonlySet<string>;
  /** Inline error message per schedule item from the last failed attempt. */
  errors: Record<string, string>;
}

const DEFAULT_ERROR = 'Could not send your feedback. Please try again.';

/** Submitted-feedback map, per-item pending state, inline errors and the `submit` action for schedule cards. */
export function useSessionFeedback({ previewAt = null }: UseSessionFeedbackOptions = {}): UseSessionFeedbackResult {
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
      const outcome = await postSessionFeedback(input, getOrCreateFeedbackClientId(), previewAt);
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
      const message = error instanceof Error && error.message ? error.message : DEFAULT_ERROR;
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

  return { submitted, submit, pendingItemIds, errors };
}
