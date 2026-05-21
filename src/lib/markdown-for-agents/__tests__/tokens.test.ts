import { describe, expect, it } from 'vitest';
import { estimateTokenCount } from '../tokens';

describe('estimateTokenCount', () => {
  it('returns 0 for empty input', () => {
    expect(estimateTokenCount('')).toBe(0);
  });

  it('rounds up partial tokens (4 chars = 1 token)', () => {
    expect(estimateTokenCount('abcd')).toBe(1);
    expect(estimateTokenCount('abcde')).toBe(2);
  });

  it('scales linearly for longer text', () => {
    const text = 'a'.repeat(400);
    expect(estimateTokenCount(text)).toBe(100);
  });
});
