import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';
import type { WorkshopOfferingSummary } from '@/lib/workshops/stripePriceLookup';
import { BreakCard } from './BreakCard';
import { EventCard } from './EventCard';
import { PlaceholderCard } from './PlaceholderCard';
import { SessionCard } from './SessionCard';

export interface ProgramScheduleItemCardProps {
  item: PublicProgramScheduleItem;
  defaultOpen?: boolean;
  placeholderVariant?: 'plain' | 'slot';
  showDuration?: boolean;
  expandableSessions?: boolean;
  /**
   * Map of workshop offerings keyed by CFP submission id. When a workshop
   * session has a matching entry, the card renders a price + Add-to-cart chip.
   */
  offeringsBySubmissionId?: Record<string, WorkshopOfferingSummary>;
}

export function ProgramScheduleItemCard({
  item,
  defaultOpen = false,
  placeholderVariant = 'slot',
  showDuration = false,
  expandableSessions = true,
  offeringsBySubmissionId,
}: ProgramScheduleItemCardProps) {
  if (item.type === 'session') {
    if (item.session) {
      const isWorkshop = item.session.type === 'workshop';
      const offering = isWorkshop
        ? offeringsBySubmissionId?.[item.session.id] ?? null
        : null;
      return (
        <SessionCard
          session={item.session}
          speaker={item.speaker ?? undefined}
          speakers={item.speakers}
          expandable={expandableSessions}
          defaultOpen={defaultOpen}
          href={isWorkshop ? `/workshops/${item.session.slug}` : item.session.type === 'panel' ? undefined : `/talks/${item.session.slug}`}
          showDuration={showDuration}
          offering={offering}
        />
      );
    }

    return (
      <PlaceholderCard
        id={item.id}
        title="To be announced"
        startTime={item.start_time}
        durationMinutes={item.duration_minutes}
        variant={placeholderVariant}
      />
    );
  }

  if (item.type === 'event') {
    return (
      <EventCard
        id={item.id}
        title={item.title}
        description={item.description}
        startTime={item.start_time}
        durationMinutes={item.duration_minutes}
      />
    );
  }

  if (item.type === 'break') {
    return (
      <BreakCard
        id={item.id}
        title={item.title}
        description={item.description}
        startTime={item.start_time}
        durationMinutes={item.duration_minutes}
      />
    );
  }

  return (
    <PlaceholderCard
      id={item.id}
      title={item.title === 'TBA' ? 'To be announced' : item.title}
      startTime={item.start_time}
      durationMinutes={item.duration_minutes}
      variant={placeholderVariant}
    />
  );
}
