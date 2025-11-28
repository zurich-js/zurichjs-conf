/**
 * Conference schedule data
 * Four-day conference schedule with community, warm-up, main conference, and post-conference days
 */

import type { ScheduleSectionProps } from '@/components/organisms';

export const scheduleData: Omit<ScheduleSectionProps, 'className'> = {
  title: 'JS Conference by humans, for humans',
  subtitle: 'Join us for four days of community building, learning, and networking. From grassroots meetups to cutting-edge technical sessions, we\'re bringing together JavaScript enthusiasts from around the world.',
  travelNote: 'We recommend booking flights arriving on the evening of the 9th and departing on the evening of the 12th or 13th.',
  accommodationNote: 'We will be partnering with hotels in the coming months to create accessible accommodation options. If you need any help and are not a Zurich local, reach out to us at hello@zurichjs.com.',
  // aboutLink: {
  //   label: 'More about us',
  //   href: 'https://zurichjs.com/about',
  // },
  days: [
    {
      id: 'community',
      label: 'Community day',
      date: 'September 9, 2026',
      description: 'Kick off the conference with a special edition warm-up meetup, regular ZurichJS style. Connect with local and visiting JavaScript developers for an evening of informal discussions and networking.',
      tbaMode: false,
      events: [
        {
          time: '17:00 – 22:00',
          title: 'ZurichJS Special Edition Warm-up Meetup',
          description: 'A special edition of our regular ZurichJS meetup to kick off the conference week. Join us for an evening of community building, networking, and informal discussions. Location TBD - centrally hosted in Zurich (not at Technopark).',
        },
      ],
    },
    {
      id: 'warmup',
      label: 'Warm-up day',
      date: 'September 10, 2026',
      description: 'A full day of workshops covering various topics and lengths, followed by an exclusive speakers dinner in the evening. All workshops will be centrally hosted in Zurich.',
      tbaMode: false,
      events: [
        {
          time: '09:00 – 17:00',
          title: 'Workshops',
          description: 'Full day of workshops with varying lengths and topics. All workshops are centrally hosted in Zurich. Workshop details will be announced soon.',
        },
        {
          time: '19:00 – 22:00',
          title: 'Speakers Dinner',
          description: 'An exclusive dinner for speakers to connect before the main conference day.',
        },
      ],
    },
    {
      id: 'conference',
      label: 'Conference day',
      date: 'September 11, 2026',
      description: 'The main conference day featuring keynote presentations, talks, and networking opportunities. Join us for a full day of learning and celebration.',
      tbaMode: false,
      events: [
        {
          time: '08:30 – 09:30',
          title: 'Registration',
          description: 'Check in, pick up your badge, and get ready for the main conference day.',
        },
        {
          time: '09:30 – 09:45',
          title: 'Opening Ceremony',
          description: 'Opening remarks to kick off the conference day.',
        },
        {
          time: '09:45 – 10:15',
          title: 'Opening Keynote',
          description: 'The opening keynote presentation to start the conference.',
        },
        {
          time: '10:15 – 12:30',
          title: 'Talks & Breaks',
          description: 'A mix of talks and breaks. Detailed breakdown to be announced.',
        },
        {
          time: '12:30 – 13:15',
          title: 'Lunch',
          description: 'Lunch break with networking opportunities.',
        },
        {
          time: '13:15 – 17:30',
          title: 'Talks & Breaks',
          description: 'Afternoon mix of talks and breaks.',
        },
        {
          time: '17:30 – 18:00',
          title: 'Closing Remarks',
          description: 'Conference wrap-up and closing remarks.',
        },
        {
          time: '18:30 onwards',
          title: 'Conference After Party',
          description: 'Celebrate the conference with food, drinks, and great company at the official after-party.',
        },
      ],
    },
    {
      id: 'post-conference',
      label: 'Post-conference chill day',
      date: 'September 12, 2026',
      description: 'A relaxed day for VIP ticket holders to join speaker activities. Activities will be announced in the future - could include hiking or other engaging experiences.',
      tbaMode: false,
      events: [
        {
          time: 'TBA',
          title: 'Speaker Activities',
          description: 'Exclusive activities for VIP ticket holders with conference speakers. Activities will be announced in the future - could include hiking or other engaging experiences.',
        },
      ],
    },
  ],
};

