/**
 * RegistrantReassignModal - Modal for reassigning workshop registration to new attendee
 */

import { useState } from 'react';
import type { WorkshopRegistrantRow } from '@/lib/workshops/getRegistrations';

export interface RegistrantReassignModalProps {
  workshopId: string;
  registration: WorkshopRegistrantRow;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (type: 'success' | 'error', text: string) => void;
}

export function RegistrantReassignModal({ workshopId, registration, onClose, onSuccess, showToast }: RegistrantReassignModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const currentName = `${registration.first_name ?? registration.profile_first_name ?? ''} ${registration.last_name ?? registration.profile_last_name ?? ''}`.trim() || '—';
  const currentEmail = registration.email ?? registration.profile_email ?? '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/workshops/${workshopId}/registrants/${registration.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName, lastName }),
      });

      if (response.ok) {
        showToast('success', 'Registration reassigned successfully!');
        onSuccess();
      } else {
        const data = await response.json();
        showToast('error', `Failed to reassign: ${data.error}`);
      }
    } catch {
      showToast('error', 'Error reassigning registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-black">Reassign Registration</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Transfer this workshop seat to a new attendee</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Current Attendee</p>
            <p className="text-sm font-semibold text-black">{currentName}</p>
            <p className="text-sm text-gray-600">{currentEmail}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-2">New Attendee Email *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">First Name *</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
              placeholder="Jane"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Last Name *</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
              placeholder="Doe"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs sm:text-sm text-blue-800">
              <strong>Note:</strong> A confirmation email will be sent to the new attendee with workshop details.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-primary text-black px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-[#e8d95e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading ? 'Reassigning...' : 'Reassign Seat'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-gray-300 text-black px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
