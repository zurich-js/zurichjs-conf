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
      id: 'announcement-blindbird',
      dateISO: '2025-11-13',
      title: 'Conference announcement & blind bird tickets',
      icon: 'ticket',
      body: 'ZurichJS Conf 2026 is officially announced! Blind bird tickets go on sale at the deepest discount—get yours before any speakers are revealed.',
      tags: [
        { label: '-30%', tone: 'accent' },
        { label: 'Extremely limited', tone: 'warning' },
      ],
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'initial-speakers',
      dateISO: '2025-12-31',
      title: 'Initial speaker lineup announced',
      icon: 'mic',
      body: 'We reveal the first wave of confirmed speakers. More speakers to be announced as we finalize the lineup.',
      tags: [{ label: 'First reveal', tone: 'success' }],
    },
    {
      id: 'early-bird',
      dateISO: '2026-01-01',
      title: 'Early bird tickets go on sale',
      icon: 'ticket',
      body: 'Great prices for the conference with initial speakers confirmed. Limited quantity available at discounted rates.',
      tags: [
        { label: '-20%', tone: 'accent' },
        { label: 'Limited stock', tone: 'warning' },
      ],
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'cfp-opens',
      dateISO: '2026-01-31',
      title: 'Call for papers opens',
      icon: 'flag',
      body: 'Have a great talk idea? Submit your proposal! We welcome speakers of all experience levels.',
      tags: [{ label: 'Submit now', tone: 'accent' }],
    },
    {
      id: 'cfp-closes',
      dateISO: '2026-03-31',
      title: 'Call for papers closes',
      icon: 'calendar',
      body: 'Final deadline to submit your talk proposals. We review all submissions carefully and notify speakers soon.',
    },
    {
      id: 'full-lineup-standard-tickets',
      dateISO: '2026-04-15',
      title: 'Full lineup announced & standard pricing begins',
      icon: 'flag',
      body: 'Complete conference schedule announced with all confirmed speakers and talks. Early bird sales end and standard ticket pricing begins.',
      tags: [{ label: 'Major milestone', tone: 'success' }],
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'late-bird',
      dateISO: '2026-08-01',
      title: 'Late bird pricing begins',
      icon: 'ticket',
      body: 'Final ticket pricing tier before the conference. Book now to secure your spot.',
      tags: [{ label: 'Last chance', tone: 'warning' }],
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'conference-days',
      dateISO: '2026-09-09',
      title: 'Conference week begins',
      icon: 'flag',
      body: 'Three days of meetups, workshops, and inspiring talks. Join us in Zurich for the event of the year!',
      tags: [{ label: 'Main event', tone: 'success' }],
      emphasis: true,
    },
  ],
};

