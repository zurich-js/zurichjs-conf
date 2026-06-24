/**
 * Ticket waitlist modal content
 * Static copy for each sold-out ticket type's waitlist modal.
 */

import { HeartHandshakeIcon, CrownIcon } from 'lucide-react';
import type { TicketWaitlistModalConfig } from '@/components/molecules/TicketWaitlistModal';

/**
 * Student / unemployed tickets — sponsor-funded waves.
 */
export const STUDENT_WAITLIST_CONFIG: TicketWaitlistModalConfig = {
  waitlistType: 'student',
  icon: HeartHandshakeIcon,
  title: 'Sponsor-funded tickets',
  description:
    'Student and unemployed tickets are made possible by our amazing sponsors. ' +
    'We release them in waves as sponsorships come in, so availability changes over time.',
  infoSection: {
    heading: 'How it works',
    steps: [
      'Sponsors fund a batch of discounted tickets',
      'We release them as a wave until they run out',
      'When new sponsors join, we release more tickets',
    ],
  },
  soldOut: {
    heading: 'Tickets are momentarily sold out.',
    body: 'Subscribe below to get notified as soon as the next wave goes live.',
  },
  notifyLabel: 'Get notified when tickets are available',
  successMessage:
    "You're on the list! We'll email you when more tickets become available.",
};

/**
 * VIP tickets — strictly limited; collect interest when sold out.
 */
export const VIP_WAITLIST_CONFIG: TicketWaitlistModalConfig = {
  waitlistType: 'vip',
  icon: CrownIcon,
  title: 'VIP tickets',
  description:
    'VIP is the full experience — exclusive after-party access, limited edition goodies, ' +
    'and 20% off all workshops. Spots are strictly limited.',
  soldOut: {
    heading: 'VIP is currently sold out.',
    body: 'Join the waitlist and we\'ll email you first if a VIP spot opens up.',
  },
  notifyLabel: 'Get notified if a VIP spot opens up',
  successMessage:
    "You're on the VIP waitlist! We'll email you first if a spot becomes available.",
};
