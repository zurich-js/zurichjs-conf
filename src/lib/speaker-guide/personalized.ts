import type { ContentSection, InfoPage } from '@/data/info-pages';
import { speakerGuide } from '@/data/speaker-guide';
import {
  speakerGuideChatContext,
  type SpeakerGuideChatContext,
} from '@/data/speaker-guide-chat';

export type PersonalizedSessionKind = 'talk' | 'workshop' | 'panel' | 'keynote' | 'event';

export interface PersonalizedGuideSession {
  title: string;
  kind: PersonalizedSessionKind;
  role: string | null;
  date: string | null;
  startTime: string | null;
  durationMinutes: number | null;
  room: string | null;
}

export interface PersonalizedGuideProfile {
  firstName: string;
  lastName: string;
  logisticsSubmitted: boolean;
  attendingWarmup: boolean | null;
  attendingDinner: boolean | null;
  attendingAfterParty: boolean | null;
  attendingSpeakerHangout: boolean | null;
  hasRegisteredPlusOne: boolean;
  plusOneNames: string[];
  sessions: PersonalizedGuideSession[];
}

export interface PersonalizedSpeakerGuide {
  guide: InfoPage;
  chatContext: SpeakerGuideChatContext[];
  speakerName: string;
}

interface SectionGroup {
  heading: ContentSection | null;
  sections: ContentSection[];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sectionId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function splitSections(sections: ContentSection[]): SectionGroup[] {
  const groups: SectionGroup[] = [{ heading: null, sections: [] }];

  for (const section of sections) {
    if (section.type === 'heading' && section.level === 'h2') {
      groups.push({ heading: section, sections: [] });
    } else {
      groups[groups.length - 1].sections.push(section);
    }
  }

  return groups;
}

function formatDate(date: string | null): string | null {
  const labels: Record<string, string> = {
    '2026-09-09': 'Wednesday, September 9',
    '2026-09-10': 'Thursday, September 10',
    '2026-09-11': 'Friday, September 11',
    '2026-09-12': 'Saturday, September 12',
  };
  return date ? labels[date] ?? date : null;
}

function formatSession(session: PersonalizedGuideSession): string {
  const details = [
    formatDate(session.date),
    session.startTime?.slice(0, 5) ?? null,
    session.room ? `Room ${escapeHtml(session.room)}` : null,
  ].filter(Boolean);
  const suffix = details.length > 0 ? ` — ${details.join(', ')}` : '';
  return `<strong>${escapeHtml(session.title)}</strong>${suffix}`;
}

function sessionSummary(sessions: PersonalizedGuideSession[]): string {
  return sessions.map(formatSession).join('; ');
}

function attendanceMarker(attending: boolean | null): string {
  return attending === true
    ? ' <strong>✓ You&apos;re attending.</strong>'
    : ' <strong>Let us know if you&apos;re attending this event.</strong>';
}

function attendingSectionMarker(): ContentSection {
  return {
    type: 'paragraph',
    content: '<strong>✓ You&apos;re attending.</strong>',
  };
}

function appendContext(
  context: SpeakerGuideChatContext[],
  section: string,
  searchTerms: string[],
  content: string[]
): void {
  const existing = context.find((entry) => entry.sectionId === section);
  if (existing) {
    existing.searchTerms.push(...searchTerms);
    existing.content.push(...content);
    return;
  }
  context.push({ sectionId: section, searchTerms, content });
}

export function buildPersonalizedSpeakerGuide(
  profile: PersonalizedGuideProfile
): PersonalizedSpeakerGuide {
  const speakerName = `${profile.firstName} ${profile.lastName}`.trim();
  const safeFirstName = escapeHtml(profile.firstName);
  const safeSpeakerName = escapeHtml(speakerName);
  const workshops = profile.sessions.filter((session) => session.kind === 'workshop');
  const stageSessions = profile.sessions.filter(
    (session) => session.kind !== 'workshop' && session.kind !== 'event'
  );
  const panels = profile.sessions.filter((session) => session.kind === 'panel');
  const lunchPanel = panels.find((session) => {
    const startTime = session.startTime?.slice(0, 5);
    return session.title.toLowerCase().includes('e18e') ||
      Boolean(startTime && startTime >= '12:00' && startTime < '14:30');
  });

  const showDinner = profile.attendingDinner === true;
  const showAfterParty = profile.attendingAfterParty === true;

  const groups = splitSections(speakerGuide.sections);
  const personalizedGroups: SectionGroup[] = [];

  for (const group of groups) {
    const heading = group.heading?.content ?? null;

    if (!heading) {
      personalizedGroups.push({
        heading: null,
        sections: group.sections.map((section, index) =>
          index === 0 && section.type === 'paragraph'
            ? {
                ...section,
                content: `Welcome, ${safeFirstName}! Having you speak at ZurichJS Conf 2026 means the world to us. This community-run conference is built on volunteered time, late nights, and a lot of love. Our CFP received 436 submissions, and yours is one of the few we chose to build the day around. We&apos;re proud to host ${safeSpeakerName} on the Zurich stage.`,
              }
            : section
        ),
      });
      continue;
    }

    if (heading === 'Workshop Day for Instructors' && workshops.length === 0) continue;
    if (heading === 'Your Talk: Slides, Stage, and Tech' && stageSessions.length === 0) continue;
    if (heading === 'Speaker Dinner at Ziegelhütte' && !showDinner) continue;
    if (heading === 'After Party at Seebad Enge' && !showAfterParty) continue;

    if (heading === 'Key Dates at a Glance') {
      const items: string[] = [];
      items.push(`<strong>Wednesday, September 9, from 18:00:</strong> Community Day, a relaxed ZurichJS meetup. See the <a href='https://zurichjs.com/events/sep-2026' target='_blank' rel='noopener noreferrer'>agenda</a> and <a href='https://www.meetup.com/zurich-js/events/315488367/' target='_blank' rel='noopener noreferrer'>RSVP on Meetup</a>.${attendanceMarker(profile.attendingWarmup)}`);
      if (workshops.length > 0) {
        items.push(`<strong>Thursday, September 10:</strong> your workshop day (${sessionSummary(workshops)}).`);
      }
      items.push(`<strong>Thursday, September 10, 18:30–22:00:</strong> speaker dinner at Ziegelhütte.${attendanceMarker(profile.attendingDinner)}`);
      items.push(`<strong>Friday, September 11:</strong> conference day at Technopark Zürich${stageSessions.length > 0 ? ` (${sessionSummary(stageSessions)})` : ''}.`);
      items.push(`<strong>Friday, September 11, 19:00–23:00:</strong> after party at Seebad Enge.${attendanceMarker(profile.attendingAfterParty)}`);
      items.push(`<strong>Saturday, September 12, 10:00–16:00:</strong> optional speaker hangout activities.${attendanceMarker(profile.attendingSpeakerHangout)}`);
      personalizedGroups.push({ heading: group.heading, sections: [{ type: 'list', items }] });
      continue;
    }

    if (heading === 'Quick Directions') {
      personalizedGroups.push({
        heading: group.heading,
        sections: group.sections.map((section) => {
          if (section.type !== 'quicklinks') return section;
          return {
            ...section,
            links: (section.links ?? []).filter((link) => {
              if (!showAfterParty && link.label.includes('After party')) return false;
              if (!showDinner && link.label.includes('dinner')) return false;
              return true;
            }),
          };
        }),
      });
      continue;
    }

    if (heading === 'Speaker Info Form and Plus Ones') {
      const plusOnes = profile.plusOneNames.map(escapeHtml);
      personalizedGroups.push({
        heading: group.heading,
        sections: profile.logisticsSubmitted
          ? [
              {
                type: 'paragraph',
                content: '<strong>✓ Your speaker information has been submitted.</strong> We have your event RSVPs, dietary requirements, T-shirt size, and any session accommodations you shared.',
              },
              {
                type: 'paragraph',
                content: plusOnes.length > 0
                  ? `We have <strong>${plusOnes.join(' and ')}</strong> registered as ${plusOnes.length === 1 ? 'your plus one' : 'your plus ones'}. We&apos;ll prepare ${plusOnes.length === 1 ? 'a VIP badge' : 'VIP badges'} for conference access.`
                  : profile.hasRegisteredPlusOne
                    ? 'You have a plus one registered. Their name was not requested for that event.'
                    : 'You do not currently have a plus one registered.',
              },
              {
                type: 'paragraph',
                content: 'If anything changes, email <a href="mailto:hello@zurichjs.com">hello@zurichjs.com</a> or message Faris, Nadja, or Bogdan.',
              },
            ]
          : [
              {
                type: 'paragraph',
                content: 'Please complete your <strong>speaker logistics form</strong> using the personal link sent directly to you. It covers event attendance, dietary requirements, your T-shirt size, session accommodations, and plus-one details.',
              },
              {
                type: 'paragraph',
                content: '<strong>Plus ones are welcome and do not need a conference ticket.</strong> Add their name to the form so we can prepare a VIP badge and plan seating, food, and venue capacity.',
              },
            ],
      });
      continue;
    }

    if (heading === 'Your Talk: Slides, Stage, and Tech') {
      personalizedGroups.push({
        heading: { type: 'heading', level: 'h2', content: 'Your Sessions, Slides, Stage, and Tech' },
        sections: [
          { type: 'paragraph', content: `${safeFirstName}, here is what we currently have scheduled for you:` },
          { type: 'list', items: stageSessions.map(formatSession) },
          ...group.sections,
        ],
      });
      continue;
    }

    if (heading === 'Workshop Day for Instructors') {
      const workshopInstructions = group.sections.find(
        (section) => section.type === 'list'
      )?.items ?? [];
      personalizedGroups.push({
        heading: { type: 'heading', level: 'h2', content: 'Your Workshop' },
        sections: [
          {
            type: 'paragraph',
            content: `${safeFirstName}, you are scheduled to lead:`,
          },
          { type: 'list', items: [...workshops.map(formatSession), ...workshopInstructions] },
        ],
      });
      continue;
    }

    if (heading === 'Speaker Dinner at Ziegelhütte' || heading === 'After Party at Seebad Enge') {
      personalizedGroups.push({
        heading: group.heading,
        sections: [attendingSectionMarker(), ...group.sections],
      });
      continue;
    }

    if (heading === 'Conference Day at Technopark') {
      personalizedGroups.push({
        heading: group.heading,
        sections: group.sections.map((section) => {
          if (section.type === 'list') {
            return {
              ...section,
              items: (section.items ?? []).map((item) =>
                item.startsWith('<strong>Schedule:</strong>') && stageSessions.length > 0
                  ? `<strong>Your conference schedule:</strong> ${sessionSummary(stageSessions)}. We&apos;ll also send a Google Calendar invitation.`
                  : item
              ),
            };
          }
          if (section.type === 'infobox' && section.title?.includes('conference lunch') && lunchPanel) {
            const timing = [lunchPanel.startTime?.slice(0, 5), lunchPanel.room].filter(Boolean).join(', ');
            return {
              ...section,
              title: '* How your lunch panel works',
              content: `Your panel, <strong>${escapeHtml(lunchPanel.title)}</strong>${timing ? ` (${escapeHtml(timing)})` : ''}, runs during lunch. Food is available throughout the lunch period, so you can eat before or after your panel. Lunch is sit-down service, and there is no separate speaker line.`,
            };
          }
          return section;
        }),
      });
      continue;
    }

    if (heading === 'FAQ') {
      personalizedGroups.push({
        heading: group.heading,
        sections: group.sections.map((section) => {
          if (section.type !== 'subsection') return section;
          return {
            ...section,
            subsections: (section.subsections ?? []).filter((subsection) => {
              const content = subsection.content ?? '';
              if (workshops.length === 0 && content.includes('workshops')) return false;
              return true;
            }),
          };
        }),
      });
      continue;
    }

    if (heading === 'See You in Zurich') {
      personalizedGroups.push({
        heading: group.heading,
        sections: group.sections.map((section) =>
          section.type === 'paragraph'
            ? { ...section, content: `That covers everything for now, ${safeFirstName}. We&apos;re proud to have you with us and look forward to welcoming you to Zurich in September. Safe travels, and see you soon!` }
            : section
        ),
      });
      continue;
    }

    personalizedGroups.push(group);
  }

  const sections = personalizedGroups.flatMap((group) =>
    group.heading ? [group.heading, ...group.sections] : group.sections
  );
  const visibleSectionIds = new Set(
    sections
      .filter((section) => section.type === 'heading' && section.level === 'h2' && section.content)
      .map((section) => sectionId(section.content ?? ''))
  );
  const remapContextSection = (id: string): string => {
    if (id === 'your-talk-slides-stage-and-tech') return 'your-sessions-slides-stage-and-tech';
    if (id === 'workshop-day-for-instructors') return 'your-workshop';
    return id;
  };
  const chatContext = speakerGuideChatContext
    .map((entry) => ({ ...entry, sectionId: remapContextSection(entry.sectionId) }))
    .filter((entry) => visibleSectionIds.has(entry.sectionId))
    .map((entry) => ({
      sectionId: entry.sectionId,
      searchTerms: [...entry.searchTerms],
      content: [...entry.content],
    }));

  const keyDatesContext = chatContext.find((entry) => entry.sectionId === 'key-dates-at-a-glance');
  if (keyDatesContext) {
    const dates = [
      profile.attendingWarmup ? 'Community Day on Wednesday, September 9' : null,
      workshops.length > 0 ? `${speakerName}'s workshop assignment on Thursday, September 10` : null,
      showDinner ? 'the speaker dinner on Thursday evening' : null,
      'conference day on Friday, September 11',
      showAfterParty ? 'the after party on Friday evening' : null,
      profile.attendingSpeakerHangout ? 'the speaker hangout on Saturday, September 12' : null,
    ].filter(Boolean);
    keyDatesContext.content = [`${speakerName}'s current guide includes ${dates.join(', ')}.`];
  }
  const directionsContext = chatContext.find((entry) => entry.sectionId === 'quick-directions');
  if (directionsContext) {
    directionsContext.content = [
      `Use the route cards shown in ${speakerName}'s guide for the journeys relevant to their current plans.`,
      'The conference venue is only about 50 metres from the speaker hotel.',
    ];
  }
  const plusOneContext = chatContext.find((entry) => entry.sectionId === 'speaker-info-form-and-plus-ones');
  if (plusOneContext) {
    plusOneContext.content = [
      profile.plusOneNames.length > 0
        ? `${speakerName}'s registered plus ${profile.plusOneNames.length === 1 ? 'one is' : 'ones are'} ${profile.plusOneNames.join(' and ')}.`
        : profile.hasRegisteredPlusOne
          ? `${speakerName} has a plus one registered, but their name was not collected for that event.`
          : `${speakerName} does not currently have a plus one registered.`,
      profile.logisticsSubmitted
        ? `${speakerName} has already submitted their speaker logistics information.`
        : `${speakerName} has not submitted their speaker logistics form yet.`,
    ];
  }

  appendContext(chatContext, 'key-dates-at-a-glance', ['personal schedule', speakerName], [
    `${speakerName}'s personalized guide only shows optional events they can attend based on their current logistics information.`,
  ]);
  appendContext(chatContext, 'speaker-info-form-and-plus-ones', ['registered guest', 'plus one name'], []);

  if (workshops.length > 0) {
    appendContext(chatContext, 'your-workshop', ['workshop assignment', 'instructor'], [
      `${speakerName} is scheduled to lead ${workshops.map((session) => session.title).join(' and ')}.`,
    ]);
  } else {
    appendContext(chatContext, 'key-dates-at-a-glance', ['workshop', 'workshop day', 'join a workshop'], [
      `${speakerName} is not scheduled to lead a workshop. If they are free and want to join workshop day anyway, they are very welcome.`,
    ]);
  }

  if (stageSessions.length > 0) {
    appendContext(chatContext, 'your-sessions-slides-stage-and-tech', ['my talk', 'my session', 'session title'], [
      `${speakerName}'s scheduled conference ${stageSessions.length === 1 ? 'session is' : 'sessions are'} ${stageSessions.map((session) => session.title).join(' and ')}.`,
    ]);
  }
  if (lunchPanel) {
    appendContext(chatContext, 'conference-day-at-technopark', ['my panel', 'lunch panel'], [
      `${speakerName} is running the lunch panel ${lunchPanel.title}.`,
    ]);
  }

  return {
    speakerName,
    guide: {
      ...speakerGuide,
      slug: `speaker-guide-${sectionId(speakerName)}`,
      title: `${profile.firstName}'s Speaker Guide`,
      description: `Personalized ZurichJS Conf 2026 speaker guidance for ${speakerName}.`,
      kicker: `For ${speakerName}`,
      sections,
    },
    chatContext,
  };
}
