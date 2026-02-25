import { describe, it, expect } from 'vitest';
import {
  ROLES,
  ROLE_HIERARCHY,
  DEFAULT_ROLE,
  hasRolePermission,
  isAdmin,
  isSpeaker,
  isAttendee,
} from '../constants';
import type { UserRole } from '@/lib/types/database';

describe('Role Constants', () => {
  describe('ROLE_HIERARCHY', () => {
    it('assigns ascending permissions: attendee < speaker < admin', () => {
      expect(ROLE_HIERARCHY.attendee).toBeLessThan(ROLE_HIERARCHY.speaker);
      expect(ROLE_HIERARCHY.speaker).toBeLessThan(ROLE_HIERARCHY.admin);
    });

    it('covers every defined role', () => {
      for (const role of Object.values(ROLES)) {
        expect(ROLE_HIERARCHY[role]).toBeDefined();
      }
    });
  });

  describe('DEFAULT_ROLE', () => {
    it('is attendee', () => {
      expect(DEFAULT_ROLE).toBe('attendee');
    });
  });

  describe('hasRolePermission', () => {
    it('allows same role access', () => {
      expect(hasRolePermission('attendee', 'attendee')).toBe(true);
      expect(hasRolePermission('speaker', 'speaker')).toBe(true);
      expect(hasRolePermission('admin', 'admin')).toBe(true);
    });

    it('allows higher roles to access lower-role resources', () => {
      expect(hasRolePermission('admin', 'attendee')).toBe(true);
      expect(hasRolePermission('admin', 'speaker')).toBe(true);
      expect(hasRolePermission('speaker', 'attendee')).toBe(true);
    });

    it('denies lower roles from accessing higher-role resources', () => {
      expect(hasRolePermission('attendee', 'speaker')).toBe(false);
      expect(hasRolePermission('attendee', 'admin')).toBe(false);
      expect(hasRolePermission('speaker', 'admin')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('returns true only for admin role', () => {
      expect(isAdmin('admin')).toBe(true);
      expect(isAdmin('speaker')).toBe(false);
      expect(isAdmin('attendee')).toBe(false);
    });
  });

  describe('isSpeaker', () => {
    it('returns true for speaker and admin', () => {
      expect(isSpeaker('speaker')).toBe(true);
      expect(isSpeaker('admin')).toBe(true);
      expect(isSpeaker('attendee')).toBe(false);
    });
  });

  describe('isAttendee', () => {
    it('returns true for all roles (everyone is at least an attendee)', () => {
      const allRoles: UserRole[] = ['attendee', 'speaker', 'admin'];
      for (const role of allRoles) {
        expect(isAttendee(role)).toBe(true);
      }
    });
  });
});
