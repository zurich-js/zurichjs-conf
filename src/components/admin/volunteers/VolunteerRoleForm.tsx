/**
 * Volunteer Role Form
 * Create/edit volunteer role form in AdminModal
 */

import { useState, useEffect } from 'react';
import { AdminModal, AdminModalFooter } from '@/components/admin/AdminModal';
import { VOLUNTEER_ROLE_STATUSES, VOLUNTEER_COMMITMENT_TYPES } from '@/lib/types/volunteer';
import { COMMITMENT_TYPE_LABELS, ROLE_STATUS_LABELS } from '@/lib/volunteer/status';
import type { VolunteerRole } from '@/lib/types/volunteer';

interface VolunteerRoleFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  role?: VolunteerRole | null;
  isSaving?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function VolunteerRoleForm({ isOpen, onClose, onSave, role, isSaving }: VolunteerRoleFormProps) {
  const isEditing = !!role;

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    summary: '',
    description: '',
    responsibilities: '',
    requirements: '',
    nice_to_haves: '',
    benefits: '',
    included_benefits: '',
    excluded_benefits: '',
    commitment_type: 'conference_day' as string,
    availability_requirements: '',
    location_context: '',
    spots_available: '' as string | number,
    show_spots_publicly: false,
    application_deadline: '',
    status: 'draft' as string,
    is_public: false,
    sort_order: 0,
    internal_notes: '',
  });

  const [autoSlug, setAutoSlug] = useState(!isEditing);

  useEffect(() => {
    if (role) {
      setFormData({
        title: role.title,
        slug: role.slug,
        summary: role.summary || '',
        description: role.description || '',
        responsibilities: role.responsibilities || '',
        requirements: role.requirements || '',
        nice_to_haves: role.nice_to_haves || '',
        benefits: role.benefits || '',
        included_benefits: role.included_benefits || '',
        excluded_benefits: role.excluded_benefits || '',
        commitment_type: role.commitment_type,
        availability_requirements: role.availability_requirements || '',
        location_context: role.location_context || '',
        spots_available: role.spots_available ?? '',
        show_spots_publicly: role.show_spots_publicly,
        application_deadline: role.application_deadline
          ? new Date(role.application_deadline).toISOString().slice(0, 10)
          : '',
        status: role.status,
        is_public: role.is_public,
        sort_order: role.sort_order,
        internal_notes: role.internal_notes || '',
      });
      setAutoSlug(false);
    } else {
      setFormData({
        title: '',
        slug: '',
        summary: '',
        description: '',
        responsibilities: '',
        requirements: '',
        nice_to_haves: '',
        benefits: '',
        included_benefits: '',
        excluded_benefits: '',
        commitment_type: 'conference_day',
        availability_requirements: '',
        location_context: '',
        spots_available: '',
        show_spots_publicly: false,
        application_deadline: '',
        status: 'draft',
        is_public: false,
        sort_order: 0,
        internal_notes: '',
      });
      setAutoSlug(true);
    }
  }, [role, isEditing]);

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'title' && autoSlug) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    const data: Record<string, unknown> = {
      ...formData,
      spots_available: formData.spots_available ? Number(formData.spots_available) : null,
      application_deadline: formData.application_deadline || null,
    };
    await onSave(data);
  };

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Role' : 'Create Role'}
      subtitle={isEditing ? role?.title : 'Add a new volunteer role'}
      size="2xl"
      showHeader
      footer={
        <AdminModalFooter
          onCancel={onClose}
          onConfirm={handleSubmit}
          confirmText={isEditing ? 'Save Changes' : 'Create Role'}
          isLoading={isSaving}
        />
      }
    >
      <div className="space-y-5 p-4 sm:p-6">
        {/* Title & Slug */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="Workshop Day Volunteer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => {
                setAutoSlug(false);
                handleChange('slug', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="workshop-day-volunteer"
            />
          </div>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
          <textarea
            value={formData.summary}
            onChange={(e) => handleChange('summary', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
            placeholder="Short description shown on the job board card"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
            placeholder="Full role description (shown on the detail page)"
          />
        </div>

        {/* Responsibilities & Requirements */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
            <textarea
              value={formData.responsibilities}
              onChange={(e) => handleChange('responsibilities', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              placeholder="One responsibility per line"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirements</label>
            <textarea
              value={formData.requirements}
              onChange={(e) => handleChange('requirements', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              placeholder="One requirement per line"
            />
          </div>
        </div>

        {/* Nice to haves */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nice to Have</label>
          <textarea
            value={formData.nice_to_haves}
            onChange={(e) => handleChange('nice_to_haves', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
            placeholder="Optional qualifications, one per line"
          />
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
            <textarea
              value={formData.benefits}
              onChange={(e) => handleChange('benefits', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              placeholder="General benefits description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Included</label>
            <textarea
              value={formData.included_benefits}
              onChange={(e) => handleChange('included_benefits', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              placeholder="One per line (e.g. Conference ticket)"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Not Included</label>
            <textarea
              value={formData.excluded_benefits}
              onChange={(e) => handleChange('excluded_benefits', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
              placeholder="One per line (e.g. Travel)"
            />
          </div>
        </div>

        {/* Commitment & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commitment Type *</label>
            <select
              value={formData.commitment_type}
              onChange={(e) => handleChange('commitment_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
            >
              {VOLUNTEER_COMMITMENT_TYPES.map((type) => (
                <option key={type} value={type}>{COMMITMENT_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
            >
              {VOLUNTEER_ROLE_STATUSES.map((s) => (
                <option key={s} value={s}>{ROLE_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
            <input
              type="date"
              value={formData.application_deadline}
              onChange={(e) => handleChange('application_deadline', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
        </div>

        {/* Availability & Location */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Availability Requirements</label>
            <input
              type="text"
              value={formData.availability_requirements}
              onChange={(e) => handleChange('availability_requirements', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="e.g. Must be available 8am-6pm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              value={formData.location_context}
              onChange={(e) => handleChange('location_context', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="e.g. On-site at Seebad Enge, Zurich"
            />
          </div>
        </div>

        {/* Spots & Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spots Available</label>
            <input
              type="number"
              min={1}
              value={formData.spots_available}
              onChange={(e) => handleChange('spots_available', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
              placeholder="e.g. 5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
            <input
              type="number"
              min={0}
              value={formData.sort_order}
              onChange={(e) => handleChange('sort_order', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={formData.show_spots_publicly}
              onChange={(e) => handleChange('show_spots_publicly', e.target.checked)}
              className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-sm text-gray-700">Show spots publicly</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <input
              type="checkbox"
              checked={formData.is_public}
              onChange={(e) => handleChange('is_public', e.target.checked)}
              className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
            />
            <span className="text-sm text-gray-700">Public on job board</span>
          </label>
        </div>

        {/* Internal Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
          <textarea
            value={formData.internal_notes}
            onChange={(e) => handleChange('internal_notes', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary resize-none"
            placeholder="Notes visible only to admins"
          />
        </div>
      </div>
    </AdminModal>
  );
}
