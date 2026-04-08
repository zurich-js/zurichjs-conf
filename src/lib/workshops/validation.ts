/**
 * Workshop Booking Validation
 * Business logic for booking rules, conflict detection, and inventory checks
 */

import type { WorkshopTimeSlot, PublicWorkshop } from '@/lib/types/workshop';

/**
 * Check if two workshops have a time slot conflict
 */
export function hasTimeSlotConflict(
  slotA: WorkshopTimeSlot,
  slotB: WorkshopTimeSlot
): boolean {
  // Full day conflicts with everything
  if (slotA === 'full_day' || slotB === 'full_day') return true;
  // Same slot conflicts
  return slotA === slotB;
}

/**
 * Check if adding a workshop to existing bookings creates a conflict
 * Returns the conflicting workshop or null
 */
export function findConflictingWorkshop(
  newWorkshop: { time_slot: WorkshopTimeSlot; id: string },
  existingBookings: Array<{ time_slot: WorkshopTimeSlot; id: string; title: string }>
): { id: string; title: string } | null {
  for (const booking of existingBookings) {
    if (booking.id === newWorkshop.id) continue;
    if (hasTimeSlotConflict(newWorkshop.time_slot, booking.time_slot)) {
      return { id: booking.id, title: booking.title };
    }
  }
  return null;
}

/**
 * Check if a workshop can be booked (has available seats)
 */
export function canBookWorkshop(workshop: {
  capacity: number;
  enrolled_count: number;
  status?: string;
}): { allowed: boolean; reason?: string } {
  if (workshop.status && workshop.status !== 'published') {
    return { allowed: false, reason: 'Workshop is not available for booking' };
  }

  const seatsRemaining = workshop.capacity - workshop.enrolled_count;
  if (seatsRemaining <= 0) {
    return { allowed: false, reason: 'Workshop is sold out' };
  }

  return { allowed: true };
}

/**
 * Validate a set of workshops can be booked together (no conflicts, all available)
 */
export function validateWorkshopSelection(
  workshops: Array<Pick<PublicWorkshop, 'id' | 'title' | 'time_slot' | 'capacity' | 'seats_remaining' | 'is_sold_out'>>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check each workshop is available
  for (const workshop of workshops) {
    if (workshop.is_sold_out) {
      errors.push(`"${workshop.title}" is sold out`);
    }
  }

  // Check for time slot conflicts between selected workshops
  for (let i = 0; i < workshops.length; i++) {
    for (let j = i + 1; j < workshops.length; j++) {
      if (hasTimeSlotConflict(workshops[i].time_slot, workshops[j].time_slot)) {
        errors.push(
          `"${workshops[i].title}" and "${workshops[j].title}" have a time conflict`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate total price for workshop selection
 * Applies combo discount if buying with a conference ticket
 */
export function calculateWorkshopTotal(
  workshopPrices: number[],
  conferenceTicketPrice: number | null,
  comboDiscountPercent: number
): {
  workshopSubtotal: number;
  ticketPrice: number;
  discountAmount: number;
  total: number;
  isCombo: boolean;
} {
  const workshopSubtotal = workshopPrices.reduce((sum, p) => sum + p, 0);
  const ticketPrice = conferenceTicketPrice ?? 0;
  const isCombo = conferenceTicketPrice !== null && conferenceTicketPrice > 0;

  const subtotal = workshopSubtotal + ticketPrice;
  const discountAmount = isCombo
    ? Math.round((subtotal * comboDiscountPercent) / 100)
    : 0;
  const total = subtotal - discountAmount;

  return {
    workshopSubtotal,
    ticketPrice,
    discountAmount,
    total,
    isCombo,
  };
}
