/**
 * Ticket Utils Tests
 *
 * Focused on the shared student/unemployed price: one Stripe price serves both
 * statuses, so the approved verification type carried on the payment link
 * metadata is what distinguishes them.
 */

import { describe, it, expect } from 'vitest';
import {
  isStatusDiscountCategory,
  resolveVerificationCategory,
  getTicketDisplayName,
  toLegacyType,
} from '../ticket-utils';

describe('isStatusDiscountCategory', () => {
  it('should be true for the shared status-discount categories', () => {
    expect(isStatusDiscountCategory('student')).toBe(true);
    expect(isStatusDiscountCategory('unemployed')).toBe(true);
  });

  it('should be false for full-price categories', () => {
    expect(isStatusDiscountCategory('standard')).toBe(false);
    expect(isStatusDiscountCategory('vip')).toBe(false);
  });
});

describe('resolveVerificationCategory', () => {
  it('should read the explicit verification_type key', () => {
    expect(resolveVerificationCategory({ verification_type: 'unemployed' })).toBe('unemployed');
    expect(resolveVerificationCategory({ verification_type: 'student' })).toBe('student');
  });

  it('should read the legacy type key on links created before verification_type existed', () => {
    expect(resolveVerificationCategory({ type: 'unemployed_verification' })).toBe('unemployed');
    expect(resolveVerificationCategory({ type: 'student_verification' })).toBe('student');
  });

  it('should prefer verification_type over the legacy type key', () => {
    expect(
      resolveVerificationCategory({
        verification_type: 'unemployed',
        type: 'student_verification',
      })
    ).toBe('unemployed');
  });

  it('should return null for non-verification metadata', () => {
    expect(resolveVerificationCategory({ type: 'vip_upgrade' })).toBeNull();
    expect(resolveVerificationCategory({ customer_name: 'Ada Lovelace' })).toBeNull();
    expect(resolveVerificationCategory(null)).toBeNull();
    expect(resolveVerificationCategory(undefined)).toBeNull();
  });

  it('should return null for unknown verification types', () => {
    expect(resolveVerificationCategory({ verification_type: 'vip' })).toBeNull();
    expect(resolveVerificationCategory({ type: 'freelancer_verification' })).toBeNull();
  });
});

describe('unemployed category downstream mapping', () => {
  it('should produce an unemployed display name and legacy type', () => {
    expect(getTicketDisplayName('unemployed', 'general_admission')).toBe('Unemployed Ticket');
    expect(toLegacyType('unemployed', 'general_admission')).toBe('unemployed');
  });
});
