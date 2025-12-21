/**
 * Submission Details Component
 * Display abstract, tags, outline, notes, workshop details, and travel info
 */

import { Eye } from 'lucide-react';

interface SubmissionDetailsProps {
  submission: {
    abstract: string;
    submission_type: string;
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

export function SubmissionDetails({ submission, isAnonymous }: SubmissionDetailsProps) {
  return (
    <div className="space-y-6">
      {/* Anonymous Notice */}
      {isAnonymous && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-purple-300">
            <Eye className="w-5 h-5" />
            <span className="text-sm font-medium">Anonymous Review Mode</span>
          </div>
        </div>
      )}

      {/* Abstract */}
      <section className="bg-brand-gray-dark rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Abstract</h2>
        <p className="text-brand-gray-light whitespace-pre-wrap">{submission.abstract}</p>
      </section>

      {/* Tags */}
      {submission.tags && submission.tags.length > 0 && (
        <section className="bg-brand-gray-dark rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {submission.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 bg-brand-gray-darkest text-brand-gray-light rounded-full text-sm"
              >
                {tag.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Outline */}
      {submission.outline && (
        <section className="bg-brand-gray-dark rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Outline</h2>
          <p className="text-brand-gray-light whitespace-pre-wrap">{submission.outline}</p>
        </section>
      )}

      {/* Additional Notes */}
      {submission.additional_notes && (
        <section className="bg-brand-gray-dark rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Notes from Speaker</h2>
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
