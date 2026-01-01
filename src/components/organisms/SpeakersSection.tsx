/**
 * Speakers Section
 * Displays featured speakers with clean, simple cards
 * Always horizontally scrollable on all screen sizes
 */

import { useQuery } from '@tanstack/react-query';
import type { PublicSpeaker } from '@/lib/types/cfp';

export interface SpeakersSectionProps {
  className?: string;
}

interface SpeakerCardProps {
  name: string;
  title: string;
  avatarUrl: string;
}

function SpeakerCard({ name, title, avatarUrl }: SpeakerCardProps) {
  const hasTextContent = name.trim() || title.trim();

  return (
    <div className="flex-shrink-0 w-[240px] sm:w-[220px] md:w-[240px] lg:w-[230px] xl:w-[260px]">
      <div className="relative rounded-2xl overflow-hidden bg-[#F1E271]">
        {/* Image container */}
        <div className="aspect-[3/4] relative">
          {avatarUrl && (
            <img
              src={avatarUrl}
              alt={name ? `${name} avatar` : 'Speaker avatar'}
              className="w-full h-full object-cover object-top"
              loading="lazy"
              draggable={false}
            />
          )}
          {/* Gradient overlay for text readability - only show when there's text content */}
          {hasTextContent && (
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black via-black/80 to-transparent" />
          )}
        </div>

        {/* Text content - only show when name or title exists */}
        {hasTextContent && (
          <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
            {name.trim() && <h3 className="text-white font-bold text-base leading-tight mb-1">{name}</h3>}
            {title.trim() && <p className="text-[#F1E271] text-sm opacity-90 leading-tight line-clamp-2 min-h-[2.5em]">{title}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export function SpeakersSection({ className = '' }: SpeakersSectionProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['speakers', 'public'],
    queryFn: async () => {
      const res = await fetch('/api/speakers');
      if (!res.ok) throw new Error('Failed to fetch speakers');
      return res.json() as Promise<{ speakers: PublicSpeaker[] }>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const speakers = data?.speakers || [];

  // Sort speakers so those with names come first
  const sortedSpeakers = [...speakers].sort((a, b) => {
    const aHasName = Boolean(a.first_name?.trim() || a.last_name?.trim());
    const bHasName = Boolean(b.first_name?.trim() || b.last_name?.trim());
    if (aHasName && !bHasName) return -1;
    if (!aHasName && bHasName) return 1;
    return 0;
  });

  // Don't render if no speakers or loading
  if (isLoading || speakers.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Always horizontally scrollable */}
      <div className="overflow-x-auto overscroll-x-contain scrollbar-hide">
        <div className="flex gap-4 md:gap-6 pb-4 px-4 md:px-8 w-max min-w-full justify-start lg:justify-center">
          {sortedSpeakers.slice(0, 5).map((speaker) => {
            const fullName = [speaker.first_name, speaker.last_name].filter(Boolean).join(' ');
            const titleWithCompany = [speaker.job_title, speaker.company].filter(Boolean).join(' @ ');

            return (
              <SpeakerCard
                key={speaker.id}
                name={fullName}
                title={titleWithCompany}
                avatarUrl={speaker.profile_image_url || ''}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
