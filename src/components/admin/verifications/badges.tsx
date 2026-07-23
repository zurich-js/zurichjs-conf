/**
 * Admin verifications — status badges
 */

import { GraduationCap, Briefcase } from 'lucide-react';
import { Pill } from '@/components/admin/shared/Pill';
import type { FollowUpStatus } from '@/lib/verifications';

export function StatusPill({ status }: { status: string }) {
  const tone = status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'amber';
  return <Pill tone={tone}>{status}</Pill>;
}

export function TicketStatusPill({ status }: { status: FollowUpStatus }) {
  if (status === 'purchased') return <Pill tone="green">ticket purchased</Pill>;
  if (status === 'needs_follow_up') return <Pill tone="amber">needs follow-up</Pill>;
  if (status === 'awaiting_review') return <Pill tone="blue">awaiting review</Pill>;
  return <span className="text-xs text-gray-400">&mdash;</span>;
}

export function TypeIcon({ type }: { type: string }) {
  return type === 'student' ? (
    <GraduationCap className="w-4 h-4 text-blue-600" aria-hidden="true" />
  ) : (
    <Briefcase className="w-4 h-4 text-amber-600" aria-hidden="true" />
  );
}
