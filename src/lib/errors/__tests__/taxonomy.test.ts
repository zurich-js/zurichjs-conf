import { describe, it, expect } from 'vitest';
import {
  AppError,
  DatabaseError,
  ErrorCodes,
  FulfillmentError,
  HttpError,
  clientMessageFor,
  throwIfDbError,
} from '..';

describe('AppError auto-fingerprint', () => {
  it('defaults to ClassName/CODE so grouping needs no opt-in', () => {
    const err = new FulfillmentError('seat lost', { code: ErrorCodes.WORKSHOP_SEAT_FULFILLMENT_FAILED });
    expect(err.fingerprint).toBe('FulfillmentError/WORKSHOP_SEAT_FULFILLMENT_FAILED');
    expect(err.name).toBe('FulfillmentError');
  });

  it('falls back to GENERIC without a code, and an explicit fingerprint wins', () => {
    expect(new AppError('x').fingerprint).toBe('AppError/GENERIC');
    expect(new AppError('x', { fingerprint: 'custom' }).fingerprint).toBe('custom');
  });
});

describe('domain defaults', () => {
  it('presets type/severity but lets the call site override', () => {
    const db = new DatabaseError('nope');
    expect(db.type).toBe('system');
    expect(db.severity).toBe('high');
    expect(db.code).toBe(ErrorCodes.DB_QUERY_FAILED);

    const custom = new DatabaseError('nope', { severity: 'critical' });
    expect(custom.severity).toBe('critical');
  });

  it('HttpError classifies by status', () => {
    expect(new HttpError(401, 'no').type).toBe('auth');
    expect(new HttpError(422, 'no').type).toBe('validation');
    expect(new HttpError(422, 'no').severity).toBe('low');
    expect(new HttpError(502, 'no').type).toBe('system');
    expect(new HttpError(502, 'no').severity).toBe('high');
    expect(new HttpError(404, 'no').status).toBe(404);
  });
});

describe('throwIfDbError', () => {
  it('is a no-op for null/undefined', () => {
    expect(() => throwIfDbError(null, 'load tickets')).not.toThrow();
    expect(() => throwIfDbError(undefined, 'load tickets')).not.toThrow();
  });

  it('throws a DatabaseError carrying the PostgrestError as cause', () => {
    const pgError = { message: 'relation "tickets" does not exist', code: '42P01', details: null, hint: null };
    try {
      throwIfDbError(pgError, 'Failed to load tickets', { context: { sessionId: 's1' } });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(DatabaseError);
      const dbErr = err as DatabaseError;
      expect(dbErr.message).toBe('Failed to load tickets');
      expect(dbErr.cause).toBe(pgError);
      expect(dbErr.code).toBe(ErrorCodes.DB_QUERY_FAILED);
      expect(dbErr.context).toEqual({ sessionId: 's1' });
    }
  });
});

describe('clientMessageFor', () => {
  it('returns the safe message for a known code', () => {
    expect(clientMessageFor(ErrorCodes.RATE_LIMITED)).toMatch(/too many requests/i);
  });

  it('falls back to the INTERNAL message for unknown codes — never leaks input', () => {
    expect(clientMessageFor('pg: relation secret_table does not exist')).toBe(
      clientMessageFor(ErrorCodes.INTERNAL)
    );
    expect(clientMessageFor(undefined)).toBe(clientMessageFor(ErrorCodes.INTERNAL));
  });
});
