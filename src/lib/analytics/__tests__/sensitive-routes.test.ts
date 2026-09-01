import { describe, it, expect } from 'vitest';
import {
  SCRUBBED_SEGMENT,
  isSensitiveRoute,
  scrubIdentifiers,
} from '../sensitive-routes';

const TICKET = 'a1b2c3d4-e5f6-4789-8abc-def012345678';

describe('isSensitiveRoute', () => {
  it.each([
    '/validate',
    '/checkin',
    `/validate/${TICKET}`,
    '/checkin/desk',
    `https://example.com/validate/${TICKET}`,
    `/validate/${TICKET}?station=2`,
    `/checkin#panel`,
  ])('treats %s as sensitive', (path) => {
    expect(isSensitiveRoute(path)).toBe(true);
  });

  it.each([
    '/',
    '/tickets',
    '/admin',
    '/admin/cfp',
    '/manage-order',
    'https://example.com/speakers',
  ])('treats %s as ordinary', (path) => {
    expect(isSensitiveRoute(path)).toBe(false);
  });

  it('does not match a route that merely starts with the same characters', () => {
    expect(isSensitiveRoute('/validate-voucher')).toBe(false);
    expect(isSensitiveRoute('/checkinsomething')).toBe(false);
  });

  it('returns false for an absent path', () => {
    expect(isSensitiveRoute(undefined)).toBe(false);
    expect(isSensitiveRoute(null)).toBe(false);
    expect(isSensitiveRoute('')).toBe(false);
  });

  it('fails safe by treating an unparseable URL as sensitive', () => {
    expect(isSensitiveRoute('https://')).toBe(true);
  });
});

describe('scrubIdentifiers', () => {
  it('replaces a ticket UUID in a path', () => {
    expect(scrubIdentifiers(`/validate/${TICKET}`)).toBe(`/validate/${SCRUBBED_SEGMENT}`);
  });

  it('replaces a UUID in a full URL and leaves the rest intact', () => {
    expect(scrubIdentifiers(`https://example.com/validate/${TICKET}?s=2`)).toBe(
      `https://example.com/validate/${SCRUBBED_SEGMENT}?s=2`,
    );
  });

  it('replaces every UUID when more than one is present', () => {
    const other = '99999999-8888-4777-8666-555544443333';
    expect(scrubIdentifiers(`/a/${TICKET}/b/${other}`)).toBe(
      `/a/${SCRUBBED_SEGMENT}/b/${SCRUBBED_SEGMENT}`,
    );
  });

  it('is case-insensitive', () => {
    expect(scrubIdentifiers(`/validate/${TICKET.toUpperCase()}`)).toBe(
      `/validate/${SCRUBBED_SEGMENT}`,
    );
  });

  it('scrubs identifiers outside the door routes too', () => {
    expect(scrubIdentifiers(`/manage-order/${TICKET}`)).toBe(
      `/manage-order/${SCRUBBED_SEGMENT}`,
    );
  });

  it('leaves a path with no identifier unchanged', () => {
    expect(scrubIdentifiers('/tickets')).toBe('/tickets');
  });

  it('does not mangle a non-UUID hex-ish segment', () => {
    expect(scrubIdentifiers('/orders/abc123')).toBe('/orders/abc123');
  });
});
