/**
 * Shared helper components and utilities for the program admin tabs
 */

import { CalendarRange, Coffee, MicVocal } from 'lucide-react';
import { useWorkshopOffering } from '@/hooks/useProgram';
import type { Workshop } from '@/lib/types/database';
import type { ProgramScheduleItemRecord } from '@/lib/types/program-schedule';
import type { SpeakerWithSessions } from '@/components/admin/speakers';
import { isWorkshopCommerceReady } from './utils';

export function getDisplayScheduleType(
  item: Pick<ProgramScheduleItemRecord, 'type' | 'session_id'>
): ProgramScheduleItemRecord['type'] | 'placeholder' {
  return item.type === 'session' && !item.session_id ? 'placeholder' : item.type;
}

export function formatScheduleDuration(durationMinutes: number) {
  if (durationMinutes < 60) return `${durationMinutes}m`;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const minutes = Number.parseInt(trimmed, 10);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes >= 60) return null;

  const totalMinutes = hours * 60 + minutes;
  return totalMinutes > 0 ? totalMinutes : null;
}

export function isSpeakerProfileIncomplete(speaker: SpeakerWithSessions) {
  return (
    !speaker.first_name?.trim() ||
    !speaker.last_name?.trim() ||
    !speaker.job_title?.trim() ||
    !speaker.company?.trim() ||
    !speaker.bio?.trim() ||
    !speaker.profile_image_url?.trim()
  );
}

export function TypeChip({ type }: { type: ProgramScheduleItemRecord['type'] | 'placeholder' }) {
  const config = {
    session: { icon: MicVocal, label: 'Session', className: 'border-blue-200 bg-blue-50 text-brand-blue' },
    event: { icon: CalendarRange, label: 'Event', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
    break: { icon: Coffee, label: 'Break', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    placeholder: { icon: null, label: 'Placeholder', className: 'border-transparent bg-transparent text-gray-500' },
  }[type];

  if (!config.icon) {
    return <span className="text-xs font-medium text-gray-500">{config.label}</span>;
  }

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-sm border px-1 py-0.5 text-xs font-medium ${config.className}`}>
      <Icon className="size-3.5" />
      {config.label}
    </span>
  );
}

function getWorkshopNotBuyableReason(offering: Workshop | null | undefined): string {
  if (!offering) return 'No workshop offering created';
  if (offering.status !== 'published') return 'Offering not published';
  if (!offering.stripe_product_id) return 'Missing Stripe product';
  if (!offering.stripe_price_lookup_key) return 'Missing Stripe price';

  const metadata = offering.metadata;
  const validation =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata.stripeValidation as { valid?: boolean } | undefined)
      : undefined;
  if (validation?.valid !== true) return 'Stripe validation failed';

  return 'Unknown issue';
}

export function WorkshopBuyableSignal({ sessionId }: { sessionId: string }) {
  const { data: offering, isLoading } = useWorkshopOffering(sessionId);
  if (isLoading) return <p className="mt-1 text-xs text-gray-400">Checking workshop sales...</p>;

  if (isWorkshopCommerceReady(offering)) return <p className="mt-1 text-xs font-medium text-green-700">Buyable</p>;

  const reason = getWorkshopNotBuyableReason(offering);
  return (
    <p className="mt-1 text-xs font-medium text-amber-700" title={reason}>
      Not buyable — {reason}
    </p>
  );
}
