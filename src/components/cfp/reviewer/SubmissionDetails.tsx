/**
 * Submission Details Component
 * Display abstract, tags, outline, notes, workshop details, and travel info
 */

import { Eye } from 'lucide-react';

interface SubmissionDetailsProps {
  submission: {
    abstract: string;
    submission_type: string;
    talk_level?: string;
    tags?: { id: string; name: string }[];
    outline?: string | null;
    additional_notes?: string | null;
    workshop_duration_hours?: number | null;
    workshop_max_participants?: number | null;
    previous_recording_url?: string | null;
    slides_url?: string | null;
    speaker?: {
      travel_assistance_required?: boolean | null;
      assistance_type?: 'travel' | 'accommodation' | 'both' | null;
      departure_airport?: string | null;
      special_requirements?: string | null;
    } | null;
  };
  isAnonymous: boolean;
  isSuperAdmin?: boolean;
}

// Helper to get duration label
function getDurationLabel(type: string, workshopHours?: number | null): string {
  if (type === 'workshop') {
    return workshopHours ? `${workshopHours}h - Workshop` : 'Workshop';
  }
  if (type === 'lightning') {
    return '15 min - Lightning talk';
  }
  return '30 min - Standard talk';
}

export function SubmissionDetails({ submission, isAnonymous, isSuperAdmin = false }: SubmissionDetailsProps) {
  return (
    <div className="space-y-6 w-full">
      {/* Anonymous Notice */}
      {isAnonymous && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-xs font-semibold uppercase tracking-wide">
          <Eye className="w-3.5 h-3.5" />
          Anonymous Review
        </div>
      )}

      {/* Metadata Badges */}
      <div className="flex flex-wrap gap-4 sm:gap-6 border-b border-brand-gray-dark pb-4">
        {/* Duration */}
        <div>
          <span className="text-brand-gray-medium text-xs block mb-1.5">Duration</span>
          <span className="px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full text-xs font-medium inline-block">
            {getDurationLabel(submission.submission_type, submission.workshop_duration_hours)}
          </span>
        </div>

        {/* Expertise Level */}
        {submission.talk_level && (
          <div>
            <span className="text-brand-gray-medium text-xs block mb-1.5">Expertise</span>
            <span className="px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 text-purple-300 rounded-full text-xs font-medium inline-block capitalize">
              {submission.talk_level}
            </span>
          </div>
        )}

        {/* Tags */}
        {submission.tags && submission.tags.length > 0 && (
          <div className="flex-1 min-w-0">
            <span className="text-brand-gray-medium text-xs block mb-1.5">Tags</span>
            <div className="flex flex-wrap gap-1.5">
              {submission.tags.map(tag => (
                <span
                  key={tag.id}
                  className="px-3 py-1.5 bg-teal-500/20 border border-teal-500/30 text-teal-300 rounded-full text-xs font-medium"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Abstract */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4">Abstract</h2>
        <p className="text-brand-gray-light whitespace-pre-wrap break-words">{submission.abstract}</p>
      </section>

      {/* Outline */}
      {submission.outline && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Outline</h2>
          <p className="text-brand-gray-light whitespace-pre-wrap break-words">{submission.outline}</p>
        </section>
      )}

      {/* Speaker Notes */}
      {submission.additional_notes && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Speaker notes</h2>
          <p className="text-brand-gray-light whitespace-pre-wrap break-words">{submission.additional_notes}</p>
        </section>
      )}

      {/* Workshop Details */}
      {submission.submission_type === 'workshop' && (
        <section className="bg-brand-gray-dark rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Workshop Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Duration</h3>
              <p className="text-white">{submission.workshop_duration_hours} hours</p>
            </div>
            {submission.workshop_max_participants && (
              <div>
                <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Max Participants</h3>
                <p className="text-white">{submission.workshop_max_participants}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Travel Info - hidden for anonymous reviews */}
      {!isAnonymous && (
        <section className="bg-brand-gray-dark rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Travel</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Travel Assistance</h3>
              <p className="text-white">
                {submission.speaker?.travel_assistance_required ? (
                  submission.speaker.assistance_type === 'both' ? 'Travel & Accommodation needed' :
                  submission.speaker.assistance_type === 'travel' ? 'Travel needed' :
                  submission.speaker.assistance_type === 'accommodation' ? 'Accommodation needed' :
                  'Requested'
                ) : 'Not needed'}
              </p>
            </div>
            {submission.speaker?.departure_airport && (
              <div>
                <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Departure Airport</h3>
                <p className="text-white">{submission.speaker.departure_airport}</p>
              </div>
            )}
            {submission.speaker?.special_requirements && (
              <div className="sm:col-span-2">
                <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Special Requirements</h3>
                <p className="text-white whitespace-pre-wrap">{submission.speaker.special_requirements}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Video/Slides Links - super admin only */}
      {isSuperAdmin && submission.previous_recording_url && (
        <section className="bg-brand-gray-dark rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Speaker Resources</h2>
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Previous Recording</h3>
              <a
                href={submission.previous_recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-primary hover:text-brand-primary/80 underline break-all"
              >
                {submission.previous_recording_url}
              </a>
            </div>
            {submission.slides_url && (
              <div>
                <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Slides</h3>
                <a
                  href={submission.slides_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:text-brand-primary/80 underline break-all"
                >
                  {submission.slides_url}
                </a>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
