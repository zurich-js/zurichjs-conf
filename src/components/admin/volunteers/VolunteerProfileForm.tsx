/**
 * Volunteer Profile Form
 * Create/edit volunteer profile in AdminModal
 */

import { useState, useEffect } from 'react';
import { AdminModal, AdminModalFooter } from '@/components/admin/AdminModal';
import { VOLUNTEER_PROFILE_STATUSES } from '@/lib/types/volunteer';
import { PROFILE_STATUS_LABELS } from '@/lib/volunteer/status';
import type { VolunteerProfileWithRole } from '@/lib/types/volunteer';

interface VolunteerProfileFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  profile?: VolunteerProfileWithRole | null;
  isSaving?: boolean;
}

export function VolunteerProfileForm({ isOpen, onClose, onSave, profile, isSaving }: VolunteerProfileFormProps) {
  const isEditing = !!profile;

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    linkedin_url: '',
    responsibilities: '',
    internal_contact: '',
    availability: '',
    status: 'pending_confirmation' as string,
    is_public: false,
    public_bio: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone || '',
        linkedin_url: profile.linkedin_url || '',
        responsibilities: profile.responsibilities || '',
        internal_contact: profile.internal_contact || '',
        availability: profile.availability || '',
        status: profile.status,
        is_public: profile.is_public,
        public_bio: profile.public_bio || '',
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        linkedin_url: '',
        responsibilities: '',
        internal_contact: '',
        availability: '',
        status: 'pending_confirmation',
        is_public: false,
        public_bio: '',
      });
    }
  }, [profile]);

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    await onSave(formData);
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Volunteer' : 'Add Volunteer'}
      subtitle={isEditing ? `${profile?.first_name} ${profile?.last_name}` : 'Manually add a volunteer'}
      size="lg"
      showHeader
      footer={
        <AdminModalFooter
          onCancel={onClose}
          onConfirm={handleSubmit}
          confirmText={isEditing ? 'Save Changes' : 'Add Volunteer'}
          isLoading={isSaving}
        />
      }
    >
      <div className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) => handleChange('first_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) => handleChange('last_name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
          <input
            type="text"
            value={formData.linkedin_url}
            onChange={(e) => handleChange('linkedin_url', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
          <textarea
            value={formData.responsibilities}
            onChange={(e) => handleChange('responsibilities', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
            placeholder="Specific responsibilities for this volunteer"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Contact</label>
            <input
              type="text"
              value={formData.internal_contact}
              onChange={(e) => handleChange('internal_contact', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Who they report to"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
            >
              {VOLUNTEER_PROFILE_STATUSES.map((s) => (
                <option key={s} value={s}>{PROFILE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
          <input
            type="text"
            value={formData.availability}
            onChange={(e) => handleChange('availability', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_public}
            onChange={(e) => handleChange('is_public', e.target.checked)}
            className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
          />
          <span className="text-sm text-gray-700">Show on public volunteer team page</span>
        </label>

        {formData.is_public && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Public Bio</label>
            <textarea
              value={formData.public_bio}
              onChange={(e) => handleChange('public_bio', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              placeholder="Short bio displayed publicly"
            />
          </div>
        )}
      </div>
    </AdminModal>
  );
}
