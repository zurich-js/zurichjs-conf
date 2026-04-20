import Image from 'next/image';
import Link from 'next/link';
import { Button, Heading } from '@/components/atoms';
import type { PublicSession } from '@/lib/types/cfp';
import { formatDuration, formatTimeRange } from './utils';

export interface SessionDetailSpeaker {
  name: string;
  slug: string;
  avatarUrl: string | null;
  role: string | null;
}

interface SessionDetailHeroProps {
  session: PublicSession;
  kind: 'talk' | 'workshop';
  ctaHref: string;
  ctaLabel: string;
}

interface SessionSpeakerBlockProps {
  speaker: SessionDetailSpeaker;
  label: 'Speaker' | 'Instructor';
}

const LEVEL_LABELS: Record<PublicSession['level'], string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

function formatSessionDate(date: string | null | undefined) {
  if (!date) {
    return null;
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SessionDetailHero({ session, kind, ctaHref, ctaLabel }: SessionDetailHeroProps) {
  const isWorkshop = kind === 'workshop';
  const sessionTypeLabel = isWorkshop ? 'Workshop' : 'Talk';
  const ctaVariant = isWorkshop ? 'blue' : 'primary';

  return (
    <section className="relative isolate bg-brand-black text-brand-white pt-12 md:pt-20">
      <div className="container relative mx-auto px-4 py-14 xs:px-6 sm:px-8 md:px-10 md:py-20 lg:px-12">
        <div className="max-w-screen-lg">
          <p className="text-sm font-bold uppercase tracking-[0.2em]">
            {sessionTypeLabel}
          </p>
          <Heading level="h1" variant="dark" className="mt-5 max-w-4xl text-2xl font-bold leading-none md:text-3xl">
            {session.title}
          </Heading>
          <div className="mt-8">
            <Button variant={ctaVariant} asChild href={ctaHref}>
              {ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SessionDetailInfo({ session }: { session: PublicSession }) {
  const dateLabel = formatSessionDate(session.schedule?.date);
  const timeLabel = formatTimeRange(session.schedule?.start_time, session.schedule?.duration_minutes);
  const durationLabel = formatDuration(session.schedule?.duration_minutes);
  const details = [
    { label: 'Date', value: dateLabel },
    { label: 'Time', value: timeLabel },
    { label: 'Duration', value: durationLabel },
    { label: 'Room', value: session.schedule?.room },
    { label: 'Level', value: LEVEL_LABELS[session.level] },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <section className="mt-12 border-t border-brand-gray-lightest pt-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-gray-medium">Session Details</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {details.map((item) => (
          <div key={item.label}>
            <p className="text-sm font-semibold text-brand-gray-medium">{item.label}</p>
            <p className="mt-1 text-base font-bold text-brand-black">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SessionSpeakerBlock({ speaker, label }: SessionSpeakerBlockProps) {
  return (
    <section className="mt-12 border-t border-brand-gray-lightest pt-10">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-gray-medium">{label}</p>
      <Link
        href={`/speakers/${speaker.slug}`}
        className="mt-5 flex w-fit items-center gap-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue"
      >
        {speaker.avatarUrl ? (
          <span className="relative size-16 overflow-hidden rounded-full bg-brand-gray-lightest">
            <Image src={speaker.avatarUrl} alt={speaker.name} fill className="object-cover" sizes="64px" />
          </span>
        ) : (
          <span className="flex size-16 items-center justify-center rounded-full bg-brand-black text-lg font-bold text-brand-white">
            {speaker.name.charAt(0)}
          </span>
        )}
        <span>
          <span className="block text-lg font-bold text-brand-black">{speaker.name}</span>
          {speaker.role ? <span className="mt-1 block text-sm text-brand-gray-medium">{speaker.role}</span> : null}
        </span>
      </Link>
    </section>
  );
}
