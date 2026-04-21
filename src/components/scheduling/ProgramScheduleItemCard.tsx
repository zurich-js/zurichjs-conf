import type { PublicProgramScheduleItem } from '@/lib/types/program-schedule';
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
}

export function ProgramScheduleItemCard({
  item,
  defaultOpen = false,
  placeholderVariant = 'slot',
  showDuration = false,
  expandableSessions = true,
}: ProgramScheduleItemCardProps) {
  if (item.type === 'session') {
    if (item.session) {
      return (
        <SessionCard
          session={item.session}
          speaker={item.speaker ?? undefined}
          speakers={item.speakers}
          expandable={expandableSessions}
          defaultOpen={defaultOpen}
          href={item.session.type === 'workshop' ? `/workshops/${item.session.slug}` : item.session.type === 'panel' ? undefined : `/talks/${item.session.slug}`}
          showDuration={showDuration}
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
