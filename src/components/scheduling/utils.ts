export function formatClockTime(time: string | null | undefined) {
  if (!time) {
    return null;
  }

  const [hours = '00', minutes = '00'] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

export function addMinutes(time: string | null | undefined, minutesToAdd: number | null | undefined) {
  if (!time || !minutesToAdd) {
    return null;
  }

  const [hours = '0', minutes = '0'] = time.split(':');
  const totalMinutes = Number(hours) * 60 + Number(minutes) + minutesToAdd;
  const nextHours = Math.floor(totalMinutes / 60) % 24;
  const nextMinutes = totalMinutes % 60;

  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
}

export function formatTimeRange(time: string | null | undefined, durationMinutes: number | null | undefined) {
  const startTime = formatClockTime(time);
  const endTime = addMinutes(time, durationMinutes);

  if (!startTime) {
    return null;
  }

  return endTime ? `${startTime} - ${endTime}` : startTime;
}

export function formatDuration(durationMinutes: number | null | undefined) {
  if (!durationMinutes) {
    return null;
  }

  if (durationMinutes < 60) {
    return `${durationMinutes} min`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  return `${hours}h${minutes ? `${minutes}m` : ''}`;
}

export type WorkshopAvailabilityTone = 'red' | 'orange' | 'yellow' | 'green';

export interface WorkshopAvailability {
  /** Human-readable seats label, e.g. "12 seats left". */
  label: string;
  /** True when the offering is sold out. */
  soldOut: boolean;
  /** True when seats are running low (but not sold out) — use for scarcity emphasis. */
  isLow: boolean;
  /** Brand color selected from the percentage of capacity remaining. */
  tone: WorkshopAvailabilityTone;
}

/**
 * Build a seats-remaining label and capacity color for a published workshop.
 */
export function formatWorkshopAvailability(offering: {
  soldOut: boolean;
  capacity: number;
  capacityRemaining: number;
}): WorkshopAvailability {
  if (offering.soldOut) {
    return { label: 'Sold out', soldOut: true, isLow: false, tone: 'red' };
  }

  const { capacityRemaining, capacity } = offering;
  const suffix = capacityRemaining === 1 ? 'seat left' : 'seats left';
  const capacityLeft = capacity > 0 ? capacityRemaining / capacity : 1;
  const tone: WorkshopAvailabilityTone = capacityLeft < 0.175
    ? 'red'
    : capacityLeft <= 0.3
      ? 'orange'
      : capacityLeft <= 0.5
        ? 'yellow'
        : 'green';

  return {
    label: `${capacityRemaining} ${suffix}`,
    soldOut: false,
    isLow: tone === 'red',
    tone,
  };
}
