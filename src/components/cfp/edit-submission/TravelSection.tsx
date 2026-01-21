/**
 * Travel Section
 * Display speaker travel preferences (read-only, links to profile)
 */

import Link from 'next/link';
import type { CfpSpeaker } from '@/lib/types/cfp';

interface TravelSectionProps {
  speaker: CfpSpeaker;
}

export function TravelSection({ speaker }: TravelSectionProps) {
  const getAssistanceLabel = () => {
    if (!speaker.travel_assistance_required) return 'Not needed';
    if (speaker.assistance_type === 'both') return 'Travel & Accommodation needed';
    if (speaker.assistance_type === 'travel') return 'Travel needed';
    if (speaker.assistance_type === 'accommodation') return 'Accommodation needed';
    return 'Requested';
  };

  return (
    <section className="bg-brand-gray-dark rounded-2xl p-6 mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Travel</h2>
        <Link href="/cfp/profile" className="text-sm text-brand-primary hover:text-brand-primary/80 transition-colors">
          Edit in Profile →
        </Link>
      </div>

      <div className="bg-brand-gray-darkest rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-brand-gray-medium text-sm">Travel Assistance</span>
          <span className="text-white font-medium">{getAssistanceLabel()}</span>
        </div>
        {speaker.departure_airport && (
          <div className="flex items-center justify-between">
            <span className="text-brand-gray-medium text-sm">Departure Airport</span>
            <span className="text-white">{speaker.departure_airport}</span>
          </div>
        )}
        {speaker.special_requirements && (
          <div>
            <span className="text-brand-gray-medium text-sm block mb-1">Special Requirements</span>
            <p className="text-white text-sm whitespace-pre-wrap">{speaker.special_requirements}</p>
          </div>
        )}
      </div>

      <p className="text-xs text-brand-gray-medium">
        Travel preferences are managed in your speaker profile and apply to all your submissions.
      </p>
    </section>
  );
}
