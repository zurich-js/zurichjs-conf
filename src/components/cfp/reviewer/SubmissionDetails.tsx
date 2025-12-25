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
    travel_assistance_required: boolean;
    company_can_cover_travel: boolean;
    travel_origin?: string | null;
  };
  isAnonymous: boolean;
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

export function SubmissionDetails({ submission, isAnonymous }: SubmissionDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Anonymous Notice */}
      {isAnonymous && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full text-xs font-semibold uppercase tracking-wide">
          <Eye className="w-3.5 h-3.5" />
          Anonymous Review
        </div>
      )}

      {/* Metadata Row */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm border-b border-brand-gray-dark pb-4">
        {/* Duration */}
        <div>
          <span className="text-brand-gray-medium block text-xs mb-1">Duration</span>
          <span className="text-brand-gray-light">
            {getDurationLabel(submission.submission_type, submission.workshop_duration_hours)}
          </span>
        </div>

        {/* Expertise Level */}
        {submission.talk_level && (
          <div>
            <span className="text-brand-gray-medium block text-xs mb-1">Expertise</span>
            <span className="text-brand-gray-light capitalize">{submission.talk_level}</span>
          </div>
        )}

        {/* Tags inline */}
        {submission.tags && submission.tags.length > 0 && (
          <div>
            <span className="text-brand-gray-medium block text-xs mb-1">Tags</span>
            <span className="text-brand-gray-light">
              {submission.tags.map(t => t.name).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Abstract */}
      <section>
        <h2 className="text-lg font-bold text-white mb-4">Abstract</h2>
        <p className="text-brand-gray-light whitespace-pre-wrap">{submission.abstract}</p>
      </section>

      {/* Outline */}
      {submission.outline && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Outline</h2>
          <p className="text-brand-gray-light whitespace-pre-wrap">{submission.outline}</p>
        </section>
      )}

      {/* Speaker Notes */}
      {submission.additional_notes && (
        <section>
          <h2 className="text-lg font-bold text-white mb-4">Speaker notes</h2>
          <p className="text-brand-gray-light whitespace-pre-wrap">{submission.additional_notes}</p>
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

      {/* Travel Info */}
      <section className="bg-brand-gray-dark rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Travel</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Travel Assistance</h3>
            <p className="text-white">
              {submission.travel_assistance_required ? 'Requested' : 'Not needed'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Company Covers Travel</h3>
            <p className="text-white">
              {submission.company_can_cover_travel ? 'Yes' : 'No'}
            </p>
          </div>
          {submission.travel_origin && (
            <div className="sm:col-span-2">
              <h3 className="text-sm font-medium text-brand-gray-medium mb-1">Traveling From</h3>
              <p className="text-white">{submission.travel_origin}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
