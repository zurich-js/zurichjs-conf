/**
 * Conference timeline data
 * Important dates and milestones leading up to the conference
 */

import type { TimelineSectionProps } from '@/components/organisms';

export const timelineData: Omit<TimelineSectionProps, 'className'> = {
  kicker: 'TIMELINE',
  title: 'Your journey to ZurichJS Conf',
  copy: 'Stay up to date with all important dates and milestones leading up to the conference. Mark your calendar for ticket sales, speaker announcements, and more.',
  entries: [
    {
      id: 'announcement',
      dateISO: '2025-11-15',
      title: 'Conference announcement',
      icon: 'info',
      body: 'We officially announce ZurichJS Conf 2026 with our call for speakers and early registration.',
    },
    {
      id: 'early-bird',
      dateISO: '2025-12-01',
      title: 'Early bird tickets go on sale',
      icon: 'ticket',
      body: 'Get the best prices for the conference. Limited quantity available at deeply discounted rates.',
      tags: [
        { label: '-20%', tone: 'accent' },
        { label: 'Limited stock', tone: 'warning' },
      ],
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'speakers-close',
      dateISO: '2026-01-31',
      title: 'Call for speakers closes',
      icon: 'mic',
      body: 'Last chance to submit your talk proposals for the conference. We review all submissions carefully.',
    },
    {
      id: 'speakers-announced',
      dateISO: '2026-03-15',
      title: 'Speaker lineup revealed',
      icon: 'flag',
      body: 'We announce the full speaker lineup and conference schedule. Get excited to see who will be presenting!',
      tags: [{ label: 'Major milestone', tone: 'success' }],
      emphasis: true,
    },
    {
      id: 'standard-tickets',
      dateISO: '2026-04-01',
      title: 'Standard ticket sales begin',
      icon: 'ticket',
      body: 'Regular-priced tickets now available. Early bird tickets no longer offered.',
      href: '#tickets',
    },
    {
      id: 'workshop-announce',
      dateISO: '2026-05-01',
      title: 'Workshop schedule published',
      icon: 'calendar',
      body: 'Detailed workshop descriptions and schedules released. Pre-registration for popular workshops opens.',
      tags: [{ label: 'Workshop day', tone: 'neutral' }],
    },
    {
      id: 'final-tickets',
      dateISO: '2026-08-15',
      title: 'Final ticket release',
      icon: 'ticket',
      body: 'Last batch of tickets available. Once these are gone, tickets will only be available at the door (if capacity allows).',
      tags: [{ label: 'Last chance', tone: 'warning' }],
      href: '#tickets',
    },
    {
      id: 'conference-days',
      dateISO: '2026-09-09',
      title: 'Conference begins',
      icon: 'flag',
      body: 'Three days of community, workshops, and talks. Join us in Zurich for the event of the year!',
      tags: [{ label: 'Main event', tone: 'success' }],
      emphasis: true,
    },
  ],
};

