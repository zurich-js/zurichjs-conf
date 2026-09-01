/**
 * Client-side reader for the server's Zod validation failures.
 *
 * API routes respond 400 with `{ error: 'Validation failed', code, issues,
 * requestId }` (Zod's `issues` array). Until now NO client code read
 * `issues` — users saw the literal string "Validation failed" with no hint
 * which field was wrong. Feed an ApiError (or its `data`) through
 * `extractFieldErrors` and map the result onto form fields.
 */

import { ApiError } from './client';

interface ZodIssueLike {
  path?: Array<string | number>;
  message?: string;
}

export interface FieldErrors {
  /** Per-field messages keyed by the field's top-level name. */
  fields: Record<string, string>;
  /** Issues with no usable path (form-level problems). */
  formErrors: string[];
}

function readIssues(source: unknown): ZodIssueLike[] {
  if (!source || typeof source !== 'object') return [];
  const issues = (source as { issues?: unknown }).issues;
  return Array.isArray(issues) ? (issues as ZodIssueLike[]) : [];
}

/**
 * Extract field-level errors from a failed API response.
 * Accepts the thrown error directly — pass whatever the mutation gave you.
 */
export function extractFieldErrors(error: unknown): FieldErrors {
  const source = error instanceof ApiError ? error.data : error;
  const issues = readIssues(source);

  const fields: Record<string, string> = {};
  const formErrors: string[] = [];

  for (const issue of issues) {
    if (!issue.message) continue;
    const key = issue.path?.find((segment): segment is string => typeof segment === 'string');
    if (key) {
      // Keep the FIRST message per field — Zod often stacks several.
      fields[key] ??= issue.message;
    } else {
      formErrors.push(issue.message);
    }
  }

  return { fields, formErrors };
}

/** True when the error is the server's Zod 400 with at least one issue. */
export function hasFieldErrors(error: unknown): boolean {
  const { fields, formErrors } = extractFieldErrors(error);
  return Object.keys(fields).length > 0 || formErrors.length > 0;
}
