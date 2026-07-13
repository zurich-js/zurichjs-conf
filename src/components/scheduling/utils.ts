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

/** Seats-remaining threshold below which we flag a workshop as running low. */
export const WORKSHOP_LOW_SEATS_THRESHOLD = 5;

export interface WorkshopAvailability {
  /** Human-readable seats label, e.g. "12 of 30 seats left". */
  label: string;
  /** True when the offering is sold out. */
  soldOut: boolean;
  /** True when seats are running low (but not sold out) — use for scarcity emphasis. */
  isLow: boolean;
}

/**
 * Build a seats-remaining label for a published workshop offering. Always shows
 * how many seats are left (out of the total capacity) so attendees can gauge
 * availability at a glance, with a "sold out" state once capacity is reached.
 */
export function formatWorkshopAvailability(offering: {
  soldOut: boolean;
  capacity: number;
  capacityRemaining: number;
}): WorkshopAvailability {
  if (offering.soldOut) {
    return { label: 'Sold out', soldOut: true, isLow: false };
  }

  const { capacityRemaining, capacity } = offering;
  const isLow = capacityRemaining <= WORKSHOP_LOW_SEATS_THRESHOLD;
  const suffix = capacityRemaining === 1 ? 'seat left' : 'seats left';
  const label = capacity > 0
    ? `${capacityRemaining} of ${capacity} ${suffix}`
    : `${capacityRemaining} ${suffix}`;

  return { label, soldOut: false, isLow };
}
