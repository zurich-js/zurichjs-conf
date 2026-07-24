import { describe, it, expect } from 'vitest';
import { apparelPreferencesSchema } from '../apparel';
import { APPAREL_SIZES } from '@/lib/types/ticket-constants';

describe('apparelPreferencesSchema', () => {
  it('accepts a t-shirt size without a hoodie size', () => {
    const result = apparelPreferencesSchema.safeParse({ token: 'abc', tshirtSize: 'M' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tshirtSize).toBe('M');
      expect(result.data.hoodieSize).toBeUndefined();
    }
  });

  it('accepts every size from XS to 4XL for both garments', () => {
    for (const size of APPAREL_SIZES) {
      const result = apparelPreferencesSchema.safeParse({ token: 'abc', tshirtSize: size, hoodieSize: size });
      expect(result.success).toBe(true);
    }
  });

  it('accepts null sizes (clearing a preference)', () => {
    const result = apparelPreferencesSchema.safeParse({ token: 'abc', tshirtSize: null, hoodieSize: null });
    expect(result.success).toBe(true);
  });

  it('rejects sizes outside the allowed range', () => {
    expect(apparelPreferencesSchema.safeParse({ token: 'abc', tshirtSize: '5XL' }).success).toBe(false);
    expect(apparelPreferencesSchema.safeParse({ token: 'abc', tshirtSize: 'M', hoodieSize: 'huge' }).success).toBe(false);
  });

  it('rejects a missing or empty token', () => {
    expect(apparelPreferencesSchema.safeParse({ tshirtSize: 'M' }).success).toBe(false);
    expect(apparelPreferencesSchema.safeParse({ token: '', tshirtSize: 'M' }).success).toBe(false);
  });
});
