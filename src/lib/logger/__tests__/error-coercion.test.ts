/**
 * Supabase does not throw. It returns `{ data, error }` where `error` is a plain
 * object, so `error instanceof Error` is false for essentially every database
 * failure in this codebase — and the previous implementation dropped the value
 * on that test. The result was a log line naming a failure with nothing saying
 * what went wrong, which is exactly what you cannot afford at 3am.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '..';

let captured: unknown[][] = [];

beforeEach(() => {
  captured = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    captured.push(args);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Everything the logger printed, flattened, so assertions do not depend on layout. */
function output(): string {
  return captured
    .map((args) => args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
    .join('\n');
}

describe('logger.error with a non-Error cause', () => {
  it('keeps the message from a Supabase PostgrestError', () => {
    logger.error('Failed to load sponsor networking settings', {
      message: 'relation "public.networking_profiles" does not exist',
      code: '42P01',
      details: null,
      hint: null,
    });

    // Quotes are JSON-escaped in the serialized entry, so assert on the part
    // that identifies the fault rather than on exact punctuation.
    expect(output()).toContain('public.networking_profiles');
    expect(output()).toContain('does not exist');
  });

  it('keeps the Postgres error code, which is the half that identifies the fault', () => {
    // 42P01 means the table is not there — usually the wrong database entirely,
    // which the message alone does not tell you.
    logger.error('Query failed', { message: 'nope', code: '42P01' });

    expect(output()).toContain('42P01');
  });

  it('keeps details and hint', () => {
    logger.error('Query failed', {
      message: 'permission denied',
      code: '42501',
      details: 'for table networking_profiles',
      hint: 'grant select',
    });

    const printed = output();
    expect(printed).toContain('for table networking_profiles');
    expect(printed).toContain('grant select');
  });

  it('passes a real Error straight through', () => {
    const real = new Error('boom');
    logger.error('Threw', real);

    expect(output()).toContain('boom');
  });

  it('handles a thrown string', () => {
    logger.error('Threw a string', 'something went wrong');
    expect(output()).toContain('something went wrong');
  });

  it('survives a circular object rather than throwing inside the logger', () => {
    // A logger that throws while reporting an error loses both.
    const circular: Record<string, unknown> = { code: 'X' };
    circular.self = circular;

    expect(() => logger.error('Circular', circular)).not.toThrow();
  });

  it('still records nothing when there is no cause', () => {
    expect(() => logger.error('Just a message')).not.toThrow();
    expect(output()).toContain('Just a message');
  });
});
