import { describe, it, expect } from 'vitest';
import {
  canAccessRole,
  canManageUser,
  canManageTickets,
  canManageWorkshops,
  canViewWorkshopRegistrations,
} from '../guards';
import type { Profile, UserRole } from '@/lib/types/database';

function makeProfile(overrides: Partial<Profile> & { role: UserRole; id?: string }): Profile {
  const defaults: Profile = {
    id: 'user-1',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    company: null,
    phone: null,
    stripe_customer_id: null,
    role: 'attendee',
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
  return { ...defaults, ...overrides };
}

describe('canAccessRole', () => {
  it('denies when profile is null/undefined', () => {
    const result = canAccessRole(null as unknown as Profile, 'attendee');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('No user profile');
  });

  it('allows admin to access all roles', () => {
    const admin = makeProfile({ role: 'admin' });
    expect(canAccessRole(admin, 'attendee').allowed).toBe(true);
    expect(canAccessRole(admin, 'speaker').allowed).toBe(true);
    expect(canAccessRole(admin, 'admin').allowed).toBe(true);
  });

  it('denies attendee from accessing speaker resources', () => {
    const attendee = makeProfile({ role: 'attendee' });
    const result = canAccessRole(attendee, 'speaker');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Insufficient permissions');
  });

  it('denies attendee from accessing admin resources', () => {
    const attendee = makeProfile({ role: 'attendee' });
    expect(canAccessRole(attendee, 'admin').allowed).toBe(false);
  });

  it('allows speaker to access attendee resources', () => {
    const speaker = makeProfile({ role: 'speaker' });
    expect(canAccessRole(speaker, 'attendee').allowed).toBe(true);
  });
});

describe('canManageUser', () => {
  it('denies when profile is null', () => {
    const result = canManageUser(null as unknown as Profile, 'target-1');
    expect(result.allowed).toBe(false);
  });

  it('allows users to manage themselves regardless of role', () => {
    const attendee = makeProfile({ role: 'attendee', id: 'user-1' });
    expect(canManageUser(attendee, 'user-1').allowed).toBe(true);
  });

  it('allows admin to manage other users', () => {
    const admin = makeProfile({ role: 'admin', id: 'admin-1' });
    expect(canManageUser(admin, 'other-user').allowed).toBe(true);
  });

  it('denies non-admin from managing other users', () => {
    const attendee = makeProfile({ role: 'attendee', id: 'user-1' });
    const result = canManageUser(attendee, 'other-user');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('administrators');
  });

  it('denies speaker from managing other users', () => {
    const speaker = makeProfile({ role: 'speaker', id: 'speaker-1' });
    expect(canManageUser(speaker, 'other-user').allowed).toBe(false);
  });
});

describe('canManageTickets', () => {
  it('denies when profile is null', () => {
    expect(canManageTickets(null as unknown as Profile).allowed).toBe(false);
  });

  it('allows admin to manage tickets', () => {
    const admin = makeProfile({ role: 'admin' });
    expect(canManageTickets(admin).allowed).toBe(true);
  });

  it('denies speaker from managing tickets', () => {
    expect(canManageTickets(makeProfile({ role: 'speaker' })).allowed).toBe(false);
  });

  it('denies attendee from managing tickets', () => {
    expect(canManageTickets(makeProfile({ role: 'attendee' })).allowed).toBe(false);
  });
});

describe('canManageWorkshops', () => {
  it('denies when profile is null', () => {
    expect(canManageWorkshops(null as unknown as Profile).allowed).toBe(false);
  });

  it('allows admin to manage any workshop', () => {
    const admin = makeProfile({ role: 'admin' });
    expect(canManageWorkshops(admin, 'any-instructor-id').allowed).toBe(true);
    expect(canManageWorkshops(admin).allowed).toBe(true);
  });

  it('allows speaker to manage their own workshop', () => {
    const speaker = makeProfile({ role: 'speaker', id: 'speaker-1' });
    expect(canManageWorkshops(speaker, 'speaker-1').allowed).toBe(true);
  });

  it('denies speaker from managing another speakers workshop', () => {
    const speaker = makeProfile({ role: 'speaker', id: 'speaker-1' });
    expect(canManageWorkshops(speaker, 'speaker-2').allowed).toBe(false);
  });

  it('denies attendee from managing any workshop', () => {
    const attendee = makeProfile({ role: 'attendee', id: 'user-1' });
    expect(canManageWorkshops(attendee, 'user-1').allowed).toBe(false);
  });
});

describe('canViewWorkshopRegistrations', () => {
  it('denies when profile is null', () => {
    expect(canViewWorkshopRegistrations(null as unknown as Profile).allowed).toBe(false);
  });

  it('allows admin to view any registrations', () => {
    const admin = makeProfile({ role: 'admin' });
    expect(canViewWorkshopRegistrations(admin, 'any-instructor').allowed).toBe(true);
  });

  it('allows instructor to view their own workshop registrations', () => {
    const speaker = makeProfile({ role: 'speaker', id: 'instructor-1' });
    expect(canViewWorkshopRegistrations(speaker, 'instructor-1').allowed).toBe(true);
  });

  it('allows any user who is the instructor to view registrations', () => {
    const attendee = makeProfile({ role: 'attendee', id: 'attendee-1' });
    expect(canViewWorkshopRegistrations(attendee, 'attendee-1').allowed).toBe(true);
  });

  it('denies non-instructor non-admin from viewing registrations', () => {
    const attendee = makeProfile({ role: 'attendee', id: 'user-1' });
    expect(canViewWorkshopRegistrations(attendee, 'other-instructor').allowed).toBe(false);
  });
});
