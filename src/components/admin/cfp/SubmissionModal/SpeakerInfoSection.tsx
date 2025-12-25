/**
 * Speaker Info Section Component
 * Displays speaker details in the submission modal
 */

import { Check, Linkedin, Github, MapPin, Plane, HelpCircle } from 'lucide-react';

interface SpeakerInfo {
  first_name: string;
  last_name: string;
  email: string;
  job_title?: string | null;
  company?: string | null;
  bio?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  twitter_handle?: string | null;
  bluesky_handle?: string | null;
  mastodon_handle?: string | null;
  profile_image_url?: string | null;
  tshirt_size?: string | null;
  company_interested_in_sponsoring?: boolean | null;
  city?: string | null;
  country?: string | null;
  travel_assistance_required?: boolean | null;
  assistance_type?: 'travel' | 'accommodation' | 'both' | null;
  departure_airport?: string | null;
  special_requirements?: string | null;
}

interface SpeakerInfoSectionProps {
  speaker: SpeakerInfo;
}

export function SpeakerInfoSection({ speaker }: SpeakerInfoSectionProps) {
  const hasSocialLinks =
    speaker.linkedin_url ||
    speaker.github_url ||
    speaker.twitter_handle ||
    speaker.bluesky_handle ||
    speaker.mastodon_handle;

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <h4 className="text-xs font-bold text-black uppercase tracking-wide mb-3">Speaker Information</h4>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Profile Image */}
        <div className="flex-shrink-0 flex justify-center sm:justify-start">
          {speaker.profile_image_url ? (
            <img
              src={speaker.profile_image_url}
              alt={`${speaker.first_name} ${speaker.last_name}`}
              className="w-24 h-24 rounded-xl object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-[#F1E271] flex items-center justify-center border-2 border-gray-200">
              <span className="text-3xl font-bold text-black">
                {speaker.first_name?.[0]}
                {speaker.last_name?.[0]}
              </span>
            </div>
          )}
        </div>

        {/* Profile Details */}
        <div className="flex-1 space-y-3">
          {/* Name & Title */}
          <div>
            <p className="text-lg font-bold text-black">
              {speaker.first_name} {speaker.last_name}
            </p>
            {(speaker.job_title || speaker.company) && (
              <p className="text-sm text-gray-600">
                {speaker.job_title}
                {speaker.job_title && speaker.company && ' at '}
                {speaker.company}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <p className="text-xs text-gray-500 font-semibold">Email</p>
            <a href={`mailto:${speaker.email}`} className="text-sm text-blue-600 hover:underline break-all">
              {speaker.email}
            </a>
          </div>

          {/* Bio */}
          {speaker.bio && (
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1">Bio</p>
              <p className="text-sm text-black whitespace-pre-wrap">{speaker.bio}</p>
            </div>
          )}

          {/* Social Links */}
          {hasSocialLinks && (
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-2">Social Links</p>
              <div className="flex flex-wrap gap-2">
                {speaker.linkedin_url && (
                  <a
                    href={speaker.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                  >
                    <Linkedin className="w-3 h-3" />
                    LinkedIn
                  </a>
                )}
                {speaker.github_url && (
                  <a
                    href={speaker.github_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 text-white rounded text-xs hover:bg-gray-900 transition-colors"
                  >
                    <Github className="w-3 h-3" />
                    GitHub
                  </a>
                )}
                {speaker.twitter_handle && (
                  <a
                    href={`https://twitter.com/${speaker.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-700 rounded text-xs hover:bg-sky-200 transition-colors"
                  >
                    @{speaker.twitter_handle}
                  </a>
                )}
                {speaker.bluesky_handle && (
                  <a
                    href={`https://bsky.app/profile/${speaker.bluesky_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                  >
                    Bluesky
                  </a>
                )}
                {speaker.mastodon_handle && (
                  <a
                    href={speaker.mastodon_handle}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition-colors"
                  >
                    Mastodon
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Location & Travel Info */}
          {(speaker.city || speaker.country || speaker.travel_assistance_required !== null) && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-semibold mb-2">Location & Travel</p>
              <div className="flex flex-wrap gap-3">
                {/* Location */}
                {(speaker.city || speaker.country) && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    <MapPin className="w-3 h-3" />
                    {[speaker.city, speaker.country].filter(Boolean).join(', ')}
                  </div>
                )}

                {/* Travel Assistance Status */}
                {speaker.travel_assistance_required === true && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs">
                    <HelpCircle className="w-3 h-3" />
                    Needs {speaker.assistance_type === 'travel' ? 'Travel' : speaker.assistance_type === 'accommodation' ? 'Accommodation' : speaker.assistance_type === 'both' ? 'Travel + Accommodation' : 'Assistance'}
                  </div>
                )}
                {speaker.travel_assistance_required === false && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    <Check className="w-3 h-3" />
                    Self-funded Travel
                  </div>
                )}

                {/* Departure Airport */}
                {speaker.departure_airport && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-sky-100 text-sky-700 rounded text-xs">
                    <Plane className="w-3 h-3" />
                    {speaker.departure_airport}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* T-Shirt Size & Sponsorship Interest */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-200">
            {speaker.tshirt_size && (
              <div>
                <p className="text-xs text-gray-500">T-Shirt Size</p>
                <p className="text-sm font-medium text-black">{speaker.tshirt_size}</p>
              </div>
            )}
            {speaker.company_interested_in_sponsoring && (
              <div className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                <Check className="w-3 h-3" />
                Company interested in sponsoring
              </div>
            )}
          </div>

          {/* Special Requirements */}
          {speaker.special_requirements && (
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500 font-semibold mb-1">Special Requirements</p>
              <p className="text-sm text-black whitespace-pre-wrap">{speaker.special_requirements}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
