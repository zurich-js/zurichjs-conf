import { describe, expect, it } from 'vitest';
import type { PublicSession, PublicSpeaker } from '@/lib/types/cfp';
import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';
import {
  serializeSchedule,
  serializeSpeaker,
  serializeSpeakerList,
  serializeTalk,
  serializeTalksList,
} from '../serializers';

const talk: PublicSession = {
  id: 'sess-1',
  cfp_submission_id: 'sub-1',
  slug: 'optimizing-react-renders',
  title: 'Optimizing React Renders',
  abstract: 'A deep dive into render performance.\n\nWith examples.',
  tags: ['react', 'performance'],
  type: 'standard',
  level: 'intermediate',
  speakers: [
    {
      name: 'Jane Doe',
      role: 'Senior Engineer @ Acme',
      imageUrl: null,
      slug: 'jane-doe',
    },
  ],
  schedule: {
    date: '2026-09-11',
    start_time: '10:30',
    duration_minutes: 45,
    room: 'Main Stage',
  },
};

const speaker: PublicSpeaker = {
  id: 'spk-1',
  slug: 'jane-doe',
  first_name: 'Jane',
  last_name: 'Doe',
  job_title: 'Senior Engineer',
  company: 'Acme',
  bio: 'Jane builds fast UIs.\n\nShe loves perf work.',
  profile_image_url: null,
  header_image_url: null,
  portrait_foreground_url: null,
  portrait_background_url: null,
  is_featured: true,
  speaker_role: 'speaker',
  tags: ['react', 'performance'],
  socials: {
    linkedin_url: 'https://linkedin.com/in/jane',
    github_url: 'https://github.com/jane',
    twitter_handle: 'jane',
    bluesky_handle: null,
    mastodon_handle: null,
  },
  assigned_session_kinds: { talks: true, workshops: false },
  sessions: [talk],
};

describe('serializeSpeaker', () => {
  it('renders frontmatter, bio, and sessions', () => {
    const md = serializeSpeaker(speaker);
    expect(md.startsWith('---\n')).toBe(true);
    expect(md).toContain('slug: jane-doe');
    expect(md).toContain('name: Jane Doe');
    expect(md).toContain('featured: true');
    expect(md).toContain('tags: [react, performance]');
    expect(md).toContain('linkedin: "https://linkedin.com/in/jane"');
    expect(md).toContain('twitter: "https://twitter.com/jane"');
    expect(md).toContain('# Jane Doe');
    expect(md).toContain('## Bio');
    expect(md).toContain('Jane builds fast UIs.');
    expect(md).toContain('## Sessions');
    expect(md).toContain('### Optimizing React Renders');
    expect(md).toContain('/talks/optimizing-react-renders');
  });

  it('omits empty sections gracefully', () => {
    const bare: PublicSpeaker = {
      ...speaker,
      bio: null,
      sessions: [],
      tags: [],
      socials: {
        linkedin_url: null,
        github_url: null,
        twitter_handle: null,
        bluesky_handle: null,
        mastodon_handle: null,
      },
    };
    const md = serializeSpeaker(bare);
    expect(md).not.toContain('## Bio');
    expect(md).not.toContain('## Sessions');
    expect(md).not.toContain('tags:');
    expect(md).not.toContain('socials:');
  });
});

describe('serializeSpeakerList', () => {
  it('lists speakers with links and session refs', () => {
    const md = serializeSpeakerList([speaker]);
    expect(md).toContain('# Speaker Lineup');
    expect(md).toContain('1 speaker confirmed');
    expect(md).toContain('[Jane Doe](https://');
    expect(md).toContain('/speakers/jane-doe');
    expect(md).toContain('Sessions: [Optimizing React Renders]');
  });
});

describe('serializeTalk', () => {
  it('renders talk frontmatter with schedule + speakers', () => {
    const md = serializeTalk(talk);
    expect(md).toContain('title: Optimizing React Renders');
    expect(md).toContain('date: 2026-09-11');
    expect(md).toContain('start_time: "10:30"');
    expect(md).toContain('duration_minutes: 45');
    expect(md).toContain('room: Main Stage');
    expect(md).toContain('# Optimizing React Renders');
    expect(md).toContain('**Speakers:** [Jane Doe]');
    expect(md).toContain('**When:** ');
    expect(md).toContain('## Abstract');
    expect(md).toContain('A deep dive into render performance.');
  });
});

describe('serializeTalksList', () => {
  it('lists talks with truncated abstracts', () => {
    const md = serializeTalksList([talk]);
    expect(md).toContain('# Talks');
    expect(md).toContain('1 talk on the conference programme.');
    expect(md).toContain('## [Optimizing React Renders]');
  });

  it('sorts by schedule and falls back to title', () => {
    const second: PublicSession = {
      ...talk,
      id: 'sess-2',
      slug: 'a-second-talk',
      title: 'A Second Talk',
      schedule: { ...talk.schedule!, start_time: '09:00' },
    };
    const md = serializeTalksList([talk, second]);
    const firstHeading = md.indexOf('A Second Talk');
    const secondHeading = md.indexOf('Optimizing React Renders');
    expect(firstHeading).toBeGreaterThan(-1);
    expect(secondHeading).toBeGreaterThan(firstHeading);
  });
});

describe('serializeSchedule', () => {
  function scheduleItem(overrides: Partial<PublicProgramScheduleItem>): PublicProgramScheduleItem {
    return {
      id: 'item-1',
      date: '2026-09-11',
      start_time: '10:30',
      duration_minutes: 45,
      room: 'Main Stage',
      type: 'session',
      title: 'Optimizing React Renders',
      description: null,
      session_id: 'sess-1',
      submission_id: 'sub-1',
      is_visible: true,
      session: talk,
      speaker: {
        name: 'Jane Doe',
        role: 'Senior Engineer @ Acme',
        imageUrl: null,
        slug: 'jane-doe',
      },
      speakers: [
        {
          name: 'Jane Doe',
          role: 'Senior Engineer @ Acme',
          imageUrl: null,
          slug: 'jane-doe',
        },
      ],
      session_kind: 'talk',
      ...overrides,
    };
  }

  it('groups schedule items by day and renders a table', () => {
    const items = [
      scheduleItem({}),
      scheduleItem({
        id: 'item-2',
        start_time: '09:30',
        duration_minutes: 30,
        type: 'break',
        title: 'Doors & Coffee',
        session: null,
        speakers: [],
        session_kind: null,
      }),
    ];
    const md = serializeSchedule(items);
    expect(md).toContain('# ZurichJS Conf 2026 Schedule');
    expect(md).toContain('| Time | Room | Kind | Session | Speakers |');
    expect(md).toContain('Doors & Coffee');
    expect(md).toContain('[Optimizing React Renders](');
    expect(md).toContain('[Jane Doe](');
  });

  it('hides items flagged is_visible=false', () => {
    const items = [scheduleItem({ is_visible: false })];
    const md = serializeSchedule(items);
    expect(md).toContain('_Schedule not yet published._');
  });

  it('produces a Notes section for non-session entries with descriptions', () => {
    const items = [
      scheduleItem({
        type: 'event',
        title: 'After Party',
        description: 'Drinks at Frau Gerolds Garten.',
        session: null,
        session_id: null,
        submission_id: null,
        speakers: [],
        session_kind: null,
      }),
    ];
    const md = serializeSchedule(items);
    expect(md).toContain('### Notes');
    expect(md).toContain('After Party');
    expect(md).toContain('Drinks at Frau Gerolds Garten.');
  });
});
