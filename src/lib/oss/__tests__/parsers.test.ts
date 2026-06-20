import { describe, it, expect } from 'vitest';
import { parseRepoRef } from '../github';
import { normalizeNpmName } from '../npm';

describe('parseRepoRef', () => {
  it('parses owner/repo shorthand', () => {
    expect(parseRepoRef('vercel/next.js')).toEqual({ owner: 'vercel', name: 'next.js' });
  });

  it('parses full GitHub URLs', () => {
    expect(parseRepoRef('https://github.com/vercel/next.js')).toEqual({
      owner: 'vercel',
      name: 'next.js',
    });
  });

  it('strips trailing .git and slashes', () => {
    expect(parseRepoRef('https://github.com/vercel/next.js.git/')).toEqual({
      owner: 'vercel',
      name: 'next.js',
    });
  });

  it('rejects non-github URLs', () => {
    expect(parseRepoRef('https://gitlab.com/foo/bar')).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(parseRepoRef('')).toBeNull();
    expect(parseRepoRef('not a repo')).toBeNull();
    expect(parseRepoRef('owner/')).toBeNull();
  });
});

describe('normalizeNpmName', () => {
  it('accepts plain names', () => {
    expect(normalizeNpmName('react')).toBe('react');
  });

  it('accepts scoped names', () => {
    expect(normalizeNpmName('@types/node')).toBe('@types/node');
  });

  it('rejects URLs', () => {
    expect(normalizeNpmName('https://npmjs.com/package/react')).toBeNull();
  });

  it('rejects empty input', () => {
    expect(normalizeNpmName('')).toBeNull();
    expect(normalizeNpmName('   ')).toBeNull();
  });

  it('rejects names with invalid characters', () => {
    expect(normalizeNpmName('not a name')).toBeNull();
    expect(normalizeNpmName('@scope/foo/bar')).toBeNull();
  });
});
