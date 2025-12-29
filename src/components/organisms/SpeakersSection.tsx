/**
 * Speakers Section
 * Displays featured speakers with clean, simple cards
 * Always horizontally scrollable on all screen sizes
 */

import Link from 'next/link';
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
  const displayAvatarUrl = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=400`;

  return (
    <div className="flex-shrink-0 w-[200px] sm:w-[220px] md:w-[240px] lg:w-[230px] xl:w-[260px]">
      <div className="relative rounded-2xl overflow-hidden bg-gray-900">
        {/* Image container */}
        <div className="aspect-[3/4] relative">
          <img
            src={displayAvatarUrl}
            alt={`${name} avatar`}
            className="w-full h-full object-cover object-top"
            loading="lazy"
            draggable={false}
            onError={(e) => {
              const t = e.target as HTMLImageElement;
              t.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a1a2e&color=F1E271&size=400`;
            }}
          />
          {/* Gradient overlay for text readability - only bottom quarter */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>

        {/* Text content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-center">
          <h3 className="text-white font-bold text-base leading-tight mb-1">{name}</h3>
          <p className="text-[#F1E271] text-sm opacity-90 leading-tight">{title}</p>
        </div>
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

  // Don't render if no speakers or loading
  if (isLoading || speakers.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Always horizontally scrollable */}
      <div className="overflow-x-auto overscroll-x-contain scrollbar-hide">
        <div className="flex gap-4 md:gap-6 pb-4 px-4 md:px-8 w-max min-w-full justify-start lg:justify-center">
          {speakers.slice(0, 5).map((speaker) => {
            const fullName = `${speaker.first_name} ${speaker.last_name}`;
            const titleWithCompany = [speaker.job_title, speaker.company].filter(Boolean).join(' @ ');

            return (
              <SpeakerCard
                key={speaker.id}
                name={fullName}
                title={titleWithCompany || 'Speaker'}
                avatarUrl={speaker.profile_image_url || ''}
              />
            );
          })}
        </div>
      </div>

      {/* CTA to apply to speak */}
      <p className="text-center text-gray-600 text-base mt-6 px-4">
        Want to share your knowledge at ZurichJS?{' '}
        <Link href="/cfp" className="text-brand-blue hover:text-blue-800 duration-300 ease-in-out">
          Apply&nbsp;to&nbsp;speak
        </Link>
      </p>
    </div>
  );
}
