/**
 * Speaker week events — static content for the speaker logistics form and
 * the admin reconciliation tab.
 */

export interface SpeakerLogisticsEvent {
  key: 'warmup' | 'speakers_dinner' | 'after_party' | 'speaker_hangout';
  /** Column on cfp_speaker_logistics holding the RSVP */
  field:
    | 'attending_warmup'
    | 'attending_speakers_dinner'
    | 'attending_after_party'
    | 'attending_speaker_hangout';
  title: string;
  shortLabel: string;
  date: string;
  isoDate: string;
  time?: string;
  description: string;
  hasCatering: boolean;
  allowsPlusOne: boolean;
}

export const SPEAKER_LOGISTICS_EVENTS: readonly SpeakerLogisticsEvent[] = [
  {
    key: 'warmup',
    field: 'attending_warmup',
    title: 'Warm-Up Meetup',
    shortLabel: 'Warm-Up (Sep 9)',
    date: 'Wednesday, September 9, 2026',
    isoDate: '2026-09-09',
    description:
      'Kick off the conference week with the ZurichJS community at our warm-up meetup the evening before the workshops.',
    hasCatering: false,
    allowsPlusOne: false,
  },
  {
    key: 'speakers_dinner',
    field: 'attending_speakers_dinner',
    title: 'Speakers Dinner',
    shortLabel: 'Dinner (Sep 10)',
    date: 'Thursday, September 10, 2026',
    isoDate: '2026-09-10',
    time: '18:30 – 22:00',
    description:
      'Our thank-you dinner for all speakers. You are welcome to bring a plus one — just let us know so we can book enough seats.',
    hasCatering: true,
    allowsPlusOne: true,
  },
  {
    key: 'after_party',
    field: 'attending_after_party',
    title: 'VIP After Party',
    shortLabel: 'After Party (Sep 11)',
    date: 'Friday, September 11, 2026',
    isoDate: '2026-09-11',
    description:
      'The official VIP after party following the conference day. Plus ones receive a complimentary VIP ticket, which also includes 20% off workshops.',
    hasCatering: true,
    allowsPlusOne: true,
  },
  {
    key: 'speaker_hangout',
    field: 'attending_speaker_hangout',
    title: 'Speaker Hangout Activities',
    shortLabel: 'Hangout (Sep 12)',
    date: 'Saturday, September 12, 2026',
    isoDate: '2026-09-12',
    description:
      'A relaxed day of hangout activities with fellow speakers to wind down after the conference. Plus ones are welcome — just let us know so we can plan capacity.',
    hasCatering: false,
    allowsPlusOne: true,
  },
] as const;
