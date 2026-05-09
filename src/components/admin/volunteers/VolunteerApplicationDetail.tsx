/**
 * Volunteer Application Detail Modal
 * Shows full application details with admin review actions
 */

import { useState } from 'react';
import { ExternalLink, User, Mail, Phone, Linkedin, Globe } from 'lucide-react';
import { AdminModal, AdminModalFooter } from '@/components/admin/AdminModal';
import { VolunteerStatusBadge } from './VolunteerStatusBadge';
import { getAvailableApplicationTransitions, APPLICATION_STATUS_LABELS } from '@/lib/volunteer/status';
import { useUpdateVolunteerApplicationStatus, useCreateVolunteerProfile } from '@/hooks/useVolunteer';
import type { VolunteerApplicationWithRole, VolunteerApplicationStatus } from '@/lib/types/volunteer';
import { useToast, type Toast } from '@/hooks/useToast';

interface VolunteerApplicationDetailProps {
  application: VolunteerApplicationWithRole | null;
  isOpen: boolean;
  onClose: () => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</dt>
      <dd className="text-sm text-black">{children}</dd>
    </div>
  );
}

export function VolunteerApplicationDetail({ application, isOpen, onClose }: VolunteerApplicationDetailProps) {
  const updateStatus = useUpdateVolunteerApplicationStatus();
  const createProfile = useCreateVolunteerProfile();
  const { toasts, showToast, removeToast } = useToast();
  const [notes, setNotes] = useState('');

  if (!application) return null;

  const availableTransitions = getAvailableApplicationTransitions(application.status);

  const handleStatusChange = async (newStatus: VolunteerApplicationStatus) => {
    try {
      await updateStatus.mutateAsync({
        id: application.id,
        status: newStatus,
        internal_notes: notes || undefined,
      });
      showToast(`Status updated to ${APPLICATION_STATUS_LABELS[newStatus]}`, 'success');

      // If accepted, offer to create profile
      if (newStatus === 'accepted') {
        if (confirm('Application accepted! Create a volunteer profile from this application?')) {
          try {
            await createProfile.mutateAsync({ from_application_id: application.id });
            showToast('Volunteer profile created', 'success');
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to create profile', 'error');
          }
        }
      }

      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update status', 'error');
    }
  };

  const transitionButtons = availableTransitions.map((status) => {
    const variant =
      status === 'accepted' ? 'bg-green-600 hover:bg-green-700 text-white' :
      status === 'rejected' ? 'bg-red-600 hover:bg-red-700 text-white' :
      status === 'shortlisted' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' :
      'bg-gray-100 hover:bg-gray-200 text-black';

    return (
      <button
        key={status}
        onClick={() => handleStatusChange(status)}
        disabled={updateStatus.isPending}
        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${variant} disabled:opacity-50`}
      >
        {APPLICATION_STATUS_LABELS[status]}
      </button>
    );
  });

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${application.first_name} ${application.last_name}`}
      subtitle={`Applied for: ${application.role_title}`}
      size="xl"
      showHeader
      footer={
        <div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-3 border-t border-gray-200 bg-gray-50">
          <span className="text-sm text-gray-500 mr-auto">Change status:</span>
          {transitionButtons}
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* Status */}
        <div className="flex items-center gap-3">
          <VolunteerStatusBadge status={application.status} type="application" />
          <span className="text-sm text-gray-500">
            Ref: {application.application_id}
          </span>
        </div>

        {/* Contact Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailRow label="Name">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                {application.first_name} {application.last_name}
              </span>
            </DetailRow>
            <DetailRow label="Email">
              <a href={`mailto:${application.email}`} className="flex items-center gap-1.5 text-brand-blue hover:underline">
                <Mail className="w-3.5 h-3.5" />
                {application.email}
              </a>
            </DetailRow>
            {application.phone && (
              <DetailRow label="Phone">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {application.phone}
                </span>
              </DetailRow>
            )}
            <DetailRow label="LinkedIn">
              <a href={application.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-blue hover:underline">
                <Linkedin className="w-3.5 h-3.5" />
                Profile
                <ExternalLink className="w-3 h-3" />
              </a>
            </DetailRow>
            {application.website_url && (
              <DetailRow label="Website">
                <a href={application.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-brand-blue hover:underline">
                  <Globe className="w-3.5 h-3.5" />
                  {application.website_url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </DetailRow>
            )}
            {application.location && (
              <DetailRow label="Location">{application.location}</DetailRow>
            )}
            {application.affiliation && (
              <DetailRow label="Affiliation">{application.affiliation}</DetailRow>
            )}
          </div>
        </div>

        {/* Motivation */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Motivation</h4>
          <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
            {application.motivation}
          </p>
        </div>

        {/* Experience */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Relevant Experience</h4>
          <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
            {application.relevant_experience}
          </p>
        </div>

        {/* Availability */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Availability</h4>
          <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
            {application.availability}
          </p>
        </div>

        {/* Notes */}
        {application.notes && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Applicant Notes</h4>
            <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
              {application.notes}
            </p>
          </div>
        )}

        {/* Confirmations */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Confirmations</h4>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className={application.commitment_confirmed ? 'text-green-600' : 'text-red-500'}>
                {application.commitment_confirmed ? '✓' : '✗'}
              </span>
              Commitment understood
            </li>
            <li className="flex items-center gap-2">
              <span className={application.exclusions_confirmed ? 'text-green-600' : 'text-red-500'}>
                {application.exclusions_confirmed ? '✓' : '✗'}
              </span>
              Exclusions acknowledged
            </li>
            <li className="flex items-center gap-2">
              <span className={application.contact_consent_confirmed ? 'text-green-600' : 'text-red-500'}>
                {application.contact_consent_confirmed ? '✓' : '✗'}
              </span>
              Contact consent given
            </li>
          </ul>
        </div>

        {/* Timeline */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Timeline</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Submitted: {new Date(application.submitted_at).toLocaleString()}</p>
            {application.reviewed_at && (
              <p>Reviewed: {new Date(application.reviewed_at).toLocaleString()}</p>
            )}
            {application.reviewed_by && <p>Reviewed by: {application.reviewed_by}</p>}
          </div>
        </div>

        {/* Internal Notes */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Internal Notes</h4>
          <textarea
            value={notes || application.internal_notes || ''}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
            placeholder="Add admin-only notes about this application..."
          />
        </div>
      </div>
    </AdminModal>
  );
}
