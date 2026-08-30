/**
 * Workshop waitlist modal content
 * Static copy for the sold-out workshop waitlist, parameterised by workshop.
 */

import { GraduationCapIcon } from 'lucide-react';
import type { WaitlistModalConfig } from '@/components/molecules/WaitlistModal';

export interface WorkshopWaitlistConfigInput {
  workshopId: string;
  workshopTitle: string;
}

/**
 * Build the waitlist modal config for a single sold-out workshop.
 * Seats are capped by the room, so the waitlist exists to catch the seats that
 * free up when plans change.
 */
export function buildWorkshopWaitlistConfig({
  workshopId,
  workshopTitle,
}: WorkshopWaitlistConfigInput): WaitlistModalConfig {
  return {
    id: `workshop-${workshopId}`,
    endpoint: '/api/workshops/waitlist',
    payload: { workshopId },
    icon: GraduationCapIcon,
    title: workshopTitle,
    description:
      'Workshops are deliberately small so everyone gets hands-on time with the instructor, ' +
      'which means seats are strictly limited.',
    infoSection: {
      heading: 'How it works',
      steps: [
        'Join the waitlist for this workshop',
        'Seats open when we expand capacity or there are cancellations',
        'We email the waitlist as soon as one opens',
      ],
    },
    soldOut: {
      heading: 'This workshop is currently sold out.',
      body: "Join the waitlist and we'll email you first if a seat opens up.",
    },
    notifyLabel: 'Get notified if a seat opens up',
    successMessage:
      "You're on the waitlist! We'll email you if a seat becomes available for this workshop.",
  };
}
