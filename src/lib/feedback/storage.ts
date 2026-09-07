/**
 * Browser-side memory for session feedback.
 *
 * Two things live in localStorage:
 *  - a random client id, generated once, sent with every submission so the
 *    server can reject a second rating of the same session from this browser;
 *  - the ratings this browser has already submitted, so the schedule can show
 *    the read-only "thanks" state immediately (and after a reload) instead of
 *    the form.
 *
 * Both are conveniences, not identity. Every access is wrapped because storage
 * can throw under strict privacy settings; when it does, the client id falls
 * back to a page-scoped in-memory value so feedback can still be sent, and
 * the submission map falls back to `{}` (the hook's state carries it for the
 * rest of the page visit).
 */

import { z } from 'zod';
import type { StoredSessionFeedback } from './types';

export const FEEDBACK_CLIENT_ID_KEY = 'zurichjs_feedback_client_id';
export const FEEDBACK_SUBMISSIONS_KEY = 'zurichjs_session_feedback_v1';

type SubmissionMap = Record<string, StoredSessionFeedback>;

function getStore(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function randomClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Used when storage is unavailable: lives as long as the page does. */
let memoryClientId: string | null = null;

function isPlausibleClientId(value: string | null): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 64;
}

/**
 * Returns this browser's feedback client id, creating it on first use. Falls
 * back to a page-scoped id when storage is blocked, so a private window can
 * still submit (it just cannot remember having done so after a reload).
 */
export function getOrCreateFeedbackClientId(): string {
  const store = getStore();
  if (store) {
    try {
      const existing = store.getItem(FEEDBACK_CLIENT_ID_KEY);
      if (isPlausibleClientId(existing)) return existing;
      const created = randomClientId();
      store.setItem(FEEDBACK_CLIENT_ID_KEY, created);
      return created;
    } catch {
      /* fall through to the in-memory id */
    }
  }
  memoryClientId ??= randomClientId();
  return memoryClientId;
}

const storedFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5).nullable(),
  comment: z.string().nullable().optional(),
  submittedAt: z.string(),
});

/** Every submission this browser has made, keyed by schedule item id. */
export function readSubmittedFeedback(): SubmissionMap {
  const store = getStore();
  if (!store) return {};
  try {
    const raw = store.getItem(FEEDBACK_SUBMISSIONS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const result: SubmissionMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const entry = storedFeedbackSchema.safeParse(value);
      if (entry.success) {
        result[key] = { rating: entry.data.rating, comment: entry.data.comment ?? null, submittedAt: entry.data.submittedAt };
      }
    }
    return result;
  } catch {
    return {};
  }
}

/** Record a submission so the form never shows again for this session here. */
export function markFeedbackSubmitted(scheduleItemId: string, entry: StoredSessionFeedback): SubmissionMap {
  const next = { ...readSubmittedFeedback(), [scheduleItemId]: entry };
  const store = getStore();
  if (store) {
    try {
      store.setItem(FEEDBACK_SUBMISSIONS_KEY, JSON.stringify(next));
    } catch {
      /* storage full or unavailable — the server-side unique constraint still holds */
    }
  }
  return next;
}
