/**
 * RegistrantEditModal - Modal for editing workshop registration details
 */

import { useState } from 'react';
import type { WorkshopRegistrantRow } from '@/lib/workshops/getRegistrations';

export interface RegistrantEditModalProps {
  workshopId: string;
  registration: WorkshopRegistrantRow;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (type: 'success' | 'error', text: string) => void;
}

export function RegistrantEditModal({ workshopId, registration, onClose, onSuccess, showToast }: RegistrantEditModalProps) {
  const metadata = (registration.metadata ?? {}) as Record<string, unknown>;
  const [firstName, setFirstName] = useState(registration.first_name ?? registration.profile_first_name ?? '');
  const [lastName, setLastName] = useState(registration.last_name ?? registration.profile_last_name ?? '');
  const [email, setEmail] = useState(registration.email ?? registration.profile_email ?? '');
  const [company, setCompany] = useState(registration.company ?? (metadata.company as string) ?? '');
  const [jobTitle, setJobTitle] = useState(registration.job_title ?? (metadata.job_title as string) ?? '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/admin/workshops/${workshopId}/registrants/${registration.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName || null,
          last_name: lastName || null,
          email: email || null,
          company: company || null,
          job_title: jobTitle || null,
        }),
      });

      if (response.ok) {
        showToast('success', 'Registration updated successfully!');
        onSuccess();
      } else {
        const data = await response.json();
        showToast('error', `Failed to update: ${data.error}`);
      }
    } catch {
      showToast('error', 'Error updating registration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-black">Edit Registration</h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Update attendee details</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-black mb-2">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
              placeholder="Acme Inc."
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-black mb-2">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="block w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
              placeholder="Software Engineer"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-brand-primary text-black px-4 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-[#e8d95e] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {loading ? 'Saving...' : 'Save Changes'}
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
