/**
 * Add Partnership Modal
 * Form for creating a new partnership
 */

import React, { useState } from 'react';
import { X, Building2, Users, User, Award } from 'lucide-react';
import type { PartnershipType, CreatePartnershipRequest } from './types';

interface AddPartnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePartnershipRequest) => Promise<void>;
  isSubmitting?: boolean;
}

const PARTNERSHIP_TYPES: { value: PartnershipType; label: string; icon: typeof Building2; description: string }[] = [
  {
    value: 'community',
    label: 'Community',
    icon: Users,
    description: 'Meetup groups, user groups, Discord servers',
  },
  {
    value: 'individual',
    label: 'Individual',
    icon: User,
    description: 'Influencers, content creators, advocates',
  },
  {
    value: 'company',
    label: 'Company',
    icon: Building2,
    description: 'Tech companies, startups, enterprises',
  },
  {
    value: 'sponsor',
    label: 'Sponsor',
    icon: Award,
    description: 'Official conference sponsors',
  },
];

export function AddPartnershipModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: AddPartnershipModalProps) {
  const [formData, setFormData] = useState<CreatePartnershipRequest>({
    name: '',
    type: 'community',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    company_name: '',
    company_website: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Partnership name is required';
    }
    if (!formData.contact_name.trim()) {
      newErrors.contact_name = 'Contact name is required';
    }
    if (!formData.contact_email.trim()) {
      newErrors.contact_email = 'Contact email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }
    if (formData.company_website && !/^https?:\/\/.+/.test(formData.company_website)) {
      newErrors.company_website = 'Website must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    await onSubmit(formData);
    setFormData({
      name: '',
      type: 'community',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      company_name: '',
      company_website: '',
      notes: '',
    });
  };

  const handleChange = (field: keyof CreatePartnershipRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      {/* Modal - full width on mobile, slides up from bottom */}
      <div className="relative w-full sm:max-w-lg sm:mx-4 bg-white sm:rounded-xl text-black shadow-xl flex flex-col max-h-[100dvh] sm:max-h-[85vh]">
        {/* Header - sticky */}
        <div className="bg-[#F1E271] px-4 py-3 flex items-center justify-between shrink-0 sm:rounded-t-xl">
          <h3 className="text-base font-bold text-black">Add New Partnership</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/10 cursor-pointer -mr-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 space-y-4">
            {/* Partnership Type */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Partnership Type
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Select the type that best describes this partnership
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PARTNERSHIP_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange('type', type.value)}
                    className={`flex flex-col p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                      formData.type === type.value
                        ? 'border-[#F1E271] bg-[#F1E271]/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <type.icon
                        className={`h-4 w-4 mr-2 shrink-0 ${
                          formData.type === type.value ? 'text-black' : 'text-gray-600'
                        }`}
                      />
                      <span className={`font-medium text-sm ${
                        formData.type === type.value ? 'text-black' : 'text-gray-700'
                      }`}>
                        {type.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Partnership Name */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Partnership Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., React Zurich Meetup"
                className={`w-full px-3 py-2.5 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-base ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name ? (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Name of the organization or community</p>
              )}
            </div>

            {/* Contact Info Section */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Contact Information</p>

              {/* Contact Name */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-black mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  placeholder="John Doe"
                  className={`w-full px-3 py-2.5 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-base ${
                    errors.contact_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.contact_name ? (
                  <p className="text-red-500 text-xs mt-1">{errors.contact_name}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Primary contact for this partnership</p>
                )}
              </div>

              {/* Contact Email */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-black mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="john@example.com"
                  className={`w-full px-3 py-2.5 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-base ${
                    errors.contact_email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.contact_email ? (
                  <p className="text-red-500 text-xs mt-1">{errors.contact_email}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Partnership details will be sent here</p>
                )}
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Contact Phone
                  <span className="text-gray-400 font-normal ml-1">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange('contact_phone', e.target.value)}
                  placeholder="+41 79 123 4567"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-base"
                />
              </div>
            </div>

            {/* Company Information (for company/sponsor types) */}
            {(formData.type === 'company' || formData.type === 'sponsor') && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Company Details</p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Company Name
                      <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.company_name}
                      onChange={(e) => handleChange('company_name', e.target.value)}
                      placeholder="Acme Inc."
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-1">
                      Company Website
                      <span className="text-gray-400 font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      type="url"
                      value={formData.company_website}
                      onChange={(e) => handleChange('company_website', e.target.value)}
                      placeholder="https://example.com"
                      className={`w-full px-3 py-2.5 border rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-base ${
                        errors.company_website ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.company_website ? (
                      <p className="text-red-500 text-xs mt-1">{errors.company_website}</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Include https:// or http://</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="pt-2 border-t border-gray-100">
              <label className="block text-sm font-medium text-black mb-1">
                Notes
                <span className="text-gray-400 font-normal ml-1">(optional)</span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Agreement details, special arrangements, follow-up tasks..."
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-black placeholder-gray-400 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-base resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">Internal notes about this partnership</p>
            </div>
          </div>
        </div>

        {/* Footer - sticky at bottom */}
        <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end safe-area-pb">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#E5D665] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? 'Creating...' : 'Create Partnership'}
          </button>
        </div>
      </div>
    </div>
  );
}
