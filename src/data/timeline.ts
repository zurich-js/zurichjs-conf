/**
 * Conference timeline data
 * Important dates and milestones leading up to the conference
 */

import type { TimelineSectionProps } from '@/components/organisms';

export const timelineData: Omit<TimelineSectionProps, 'className'> = {
  kicker: 'TIMELINE',
  title: 'Your journey to ZurichJS Conf',
  subtitle: 'Stay up to date with all important dates and milestones leading up to the conference. Mark your calendar for ticket sales, speaker announcements, and more.',
  entries: [
    {
      id: 'announcement-blindbird',
      dateISO: '2025-11-14',
      title: 'Blind bird tickets on sale',
      icon: 'ticket',
      body: 'The first 30 tickets are available at the lowest possible price before speakers are announced. Get them while they last!',
      tags: [
        { label: '-30%', tone: 'success' },
        { label: 'Limited', tone: 'accent' },
      ],
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'initial-speakers-early-bird',
      dateISO: '2026-01-01',
      title: 'Early Bird tickets on sale',
      icon: 'ticket',
      body: 'Early bird tickets are now available! Get your tickets at a discounted price while speaker announcements start rolling in. Save before prices increase.',
      tags: [
        { label: '-23%', tone: 'success' },
      ],
      href: '#tickets',
    },
    {
      id: 'cfp-starts',
      dateISO: '2026-01-01',
      title: 'Call for Papers starts',
      icon: 'flag',
      body: 'Have something to share with the JavaScript community? Submit your talk proposal and join our lineup of speakers.',
    },
    {
      id: 'cfp-ends',
      dateISO: '2026-04-01',
      title: 'Call for Papers ends',
      icon: 'flag',
      body: 'Last chance to submit your talk proposal. Make sure to get your submission in before the deadline!',
    },
    {
      id: 'speaker-review',
      dateISO: '2026-05-01',
      title: 'Speaker submissions review deadline',
      icon: 'flag',
      body: 'Our team will have reviewed all submissions by this date. Speakers will be notified of their acceptance shortly after.',
    },
    {
      id: 'full-lineup-standard-tickets',
      dateISO: '2026-05-15',
      title: 'General Admission tickets',
      icon: 'ticket',
      body: 'Full speaker lineup announced! Standard pricing tickets are now available. Secure your spot before late bird pricing kicks in.',
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'late-bird',
      dateISO: '2026-08-01',
      title: 'Late sale tickets',
      icon: 'ticket',
      body: 'Final ticket pricing kicks in. Last chance to grab your spot before we sell out!',
      href: '#tickets',
      emphasis: true,
    },
    {
      id: 'conference-events',
      dateISO: '2026-09-09',
      toDateISO: '2026-09-12',
      title: 'ZurichJS Conf events',
      icon: 'flag',
      body: 'Four days of community, workshops, talks, and unforgettable experiences. See you in Zurich!',
      emphasis: true,
    },
  ],
};

