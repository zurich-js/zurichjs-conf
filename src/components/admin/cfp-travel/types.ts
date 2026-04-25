/**
 * CFP Travel Admin Component Types
 */

import type { CfpReimbursementStatus, CfpTransportStatus, CfpTransportMode } from '@/lib/types/cfp';

export type { CfpReimbursementStatus, CfpTransportStatus, CfpTransportMode };
export type TabType = 'overview' | 'speakers' | 'transportation' | 'reimbursements';

export const STATUS_COLORS: Record<CfpReimbursementStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid: 'bg-blue-100 text-blue-800',
};

export const TRANSPORT_STATUS_COLORS: Record<CfpTransportStatus, string> = {
  scheduled: 'bg-text-brand-gray-lightest text-gray-700',
  delayed: 'bg-orange-100 text-orange-700',
  canceled: 'bg-red-100 text-red-700',
  complete: 'bg-green-100 text-green-700',
};

export type AttendanceValue = boolean | null | undefined;

export function attendanceValueToSelect(value: AttendanceValue): 'unknown' | 'yes' | 'no' {
  if (value === true) return 'yes';
  if (value === false) return 'no';
  return 'unknown';
}

export function selectToAttendanceValue(value: string): boolean | null {
  if (value === 'yes') return true;
  if (value === 'no') return false;
  return null;
}
