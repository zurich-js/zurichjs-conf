import { describe, expect, it } from 'vitest';
import { isWorkEmail, extractDomain, isValidDomain } from '../detect';

describe('extractDomain', () => {
  it('extracts domain from valid email', () => {
    expect(extractDomain('user@acme.com')).toBe('acme.com');
  });

  it('normalizes to lowercase', () => {
    expect(extractDomain('User@ACME.COM')).toBe('acme.com');
  });

  it('trims whitespace', () => {
    expect(extractDomain('  user@acme.com  ')).toBe('acme.com');
  });

  it('returns null for invalid email', () => {
    expect(extractDomain('not-an-email')).toBeNull();
    expect(extractDomain('')).toBeNull();
    expect(extractDomain('@')).toBeNull();
  });
});

describe('isWorkEmail', () => {
  it('identifies free email providers', () => {
    expect(isWorkEmail('user@gmail.com')).toBe(false);
    expect(isWorkEmail('user@yahoo.com')).toBe(false);
    expect(isWorkEmail('user@hotmail.com')).toBe(false);
    expect(isWorkEmail('user@outlook.com')).toBe(false);
    expect(isWorkEmail('user@protonmail.com')).toBe(false);
    expect(isWorkEmail('user@icloud.com')).toBe(false);
  });

  it('identifies work emails', () => {
    expect(isWorkEmail('user@acme.com')).toBe(true);
    expect(isWorkEmail('user@google.com')).toBe(true);
    expect(isWorkEmail('user@zurichjs.com')).toBe(true);
    expect(isWorkEmail('user@microsoft.com')).toBe(true);
  });

  it('handles international free providers', () => {
    expect(isWorkEmail('user@gmx.com')).toBe(false);
    expect(isWorkEmail('user@yandex.com')).toBe(false);
  });

  it('returns false for invalid email', () => {
    expect(isWorkEmail('')).toBe(false);
    expect(isWorkEmail('not-an-email')).toBe(false);
  });
});

describe('isValidDomain', () => {
  it('accepts valid domains', () => {
    expect(isValidDomain('acme.com')).toBe(true);
    expect(isValidDomain('sub.domain.co.uk')).toBe(true);
    expect(isValidDomain('my-company.io')).toBe(true);
  });

  it('rejects invalid domains', () => {
    expect(isValidDomain('')).toBe(false);
    expect(isValidDomain('no-tld')).toBe(false);
    expect(isValidDomain('.leading-dot.com')).toBe(false);
    expect(isValidDomain('trailing-dot.com.')).toBe(false);
    expect(isValidDomain('has spaces.com')).toBe(false);
    expect(isValidDomain("sql'; DROP TABLE--")).toBe(false);
  });

  it('rejects domains over 253 characters', () => {
    const longDomain = 'a'.repeat(250) + '.com';
    expect(isValidDomain(longDomain)).toBe(false);
  });
});
