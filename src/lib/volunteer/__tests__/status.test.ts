/**
 * Volunteer Status Logic Test Suite
 * Tests for application status transitions and public role display status
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAvailableApplicationTransitions,
  getPublicRoleDisplayStatus,
} from '../status';
import type { VolunteerRole } from '@/lib/types/volunteer';

function makeRole(overrides: Partial<VolunteerRole>): VolunteerRole {
  return {
    id: 'role-1',
    title: 'Test Role',
    slug: 'test-role',
    summary: null,
    description: null,
    responsibilities: null,
    requirements: null,
    nice_to_haves: null,
    benefits: null,
    included_benefits: null,
    excluded_benefits: null,
    commitment_type: 'flexible',
    availability_requirements: null,
    location_context: null,
    spots_available: null,
    show_spots_publicly: false,
    application_deadline: null,
    status: 'published',
    is_public: true,
    sort_order: 0,
    internal_notes: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('getAvailableApplicationTransitions', () => {
  it('allows triage actions from submitted', () => {
    expect(getAvailableApplicationTransitions('submitted')).toEqual([
      'in_review',
      'shortlisted',
      'rejected',
      'withdrawn',
    ]);
  });

  it('allows acceptance path from in_review', () => {
    expect(getAvailableApplicationTransitions('in_review')).toEqual([
      'shortlisted',
      'accepted',
      'rejected',
      'withdrawn',
    ]);
  });

  it('allows final decisions from shortlisted', () => {
    expect(getAvailableApplicationTransitions('shortlisted')).toEqual([
      'accepted',
      'rejected',
      'withdrawn',
    ]);
  });

  it('only allows withdrawal from accepted', () => {
    expect(getAvailableApplicationTransitions('accepted')).toEqual(['withdrawn']);
  });

  it('allows reopening a rejected application', () => {
    expect(getAvailableApplicationTransitions('rejected')).toEqual(['in_review']);
  });

  it('is terminal once withdrawn', () => {
    expect(getAvailableApplicationTransitions('withdrawn')).toEqual([]);
  });
});

describe('getPublicRoleDisplayStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('treats draft roles as closed', () => {
    expect(getPublicRoleDisplayStatus(makeRole({ status: 'draft' }))).toBe('closed');
  });

  it('treats closed/archived roles as closed', () => {
    expect(getPublicRoleDisplayStatus(makeRole({ status: 'closed' }))).toBe('closed');
    expect(getPublicRoleDisplayStatus(makeRole({ status: 'archived' }))).toBe('closed');
  });

  it('is open when published with no deadline', () => {
    expect(getPublicRoleDisplayStatus(makeRole({ application_deadline: null }))).toBe('open');
  });

  it('is open when the deadline is far away', () => {
    expect(
      getPublicRoleDisplayStatus(
        makeRole({ application_deadline: '2026-08-01T00:00:00.000Z' }),
      ),
    ).toBe('open');
  });

  it('is closing_soon within 7 days of the deadline', () => {
    expect(
      getPublicRoleDisplayStatus(
        makeRole({ application_deadline: '2026-06-05T00:00:00.000Z' }),
      ),
    ).toBe('closing_soon');
  });

  it('is closed once the deadline has passed', () => {
    expect(
      getPublicRoleDisplayStatus(
        makeRole({ application_deadline: '2026-05-01T00:00:00.000Z' }),
      ),
    ).toBe('closed');
  });
});
