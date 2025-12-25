/**
 * Speakers Section
 * Displays featured speakers with responsive grid layout
 * Optimized for 5 cards on desktop, scrollable on mobile
 */

import { useQuery } from '@tanstack/react-query';
import { ProfileCard } from '@/components/ui/ProfileCard';
import type { PublicSpeaker } from '@/lib/types/cfp';

export interface SpeakersSectionProps {
  className?: string;
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
      {/* Mobile: Horizontal scroll */}
      <div className="block lg:hidden overflow-x-auto overflow-y-visible scrollbar-hide -mx-4 px-4">
        <div className="flex gap-4 pb-4 pl-4 pr-8" style={{ width: 'max-content' }}>
          {speakers.slice(0, 5).map((speaker) => {
            const fullName = `${speaker.first_name} ${speaker.last_name}`;
            const titleWithCompany = [speaker.job_title, speaker.company].filter(Boolean).join(' @ ');

            return (
              <ProfileCard
                key={speaker.id}
                name={fullName}
                title={titleWithCompany || 'Speaker'}
                avatarUrl={speaker.profile_image_url || ''}
                showUserInfo={false}
                enableTilt={true}
                enableMobileTilt={false}
                behindGlowEnabled={true}
                behindGlowColor="rgba(255, 204, 0, 0.5)"
              />
            );
          })}
        </div>
      </div>

      {/* Desktop: Centered flex with 5 cards */}
      <div className="hidden lg:flex justify-center items-center gap-6 xl:gap-8 px-4 xl:px-8">
        {speakers.slice(0, 5).map((speaker) => {
          const fullName = `${speaker.first_name} ${speaker.last_name}`;
          const titleWithCompany = [speaker.job_title, speaker.company].filter(Boolean).join(' @ ');

          return (
            <ProfileCard
              key={speaker.id}
              name={fullName}
              title={titleWithCompany || 'Speaker'}
              avatarUrl={speaker.profile_image_url || ''}
              showUserInfo={false}
              enableTilt={true}
              enableMobileTilt={false}
              behindGlowEnabled={true}
              behindGlowColor="rgba(255, 204, 0, 0.5)"
            />
          );
        })}
      </div>
    </div>
  );
}
