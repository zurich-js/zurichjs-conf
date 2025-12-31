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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="relative inline-block w-full max-w-2xl mx-0 sm:mx-4 bg-white rounded-lg text-left overflow-hidden shadow-xl transform my-2 sm:my-8 text-black max-h-[95vh] sm:max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-[#F1E271] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
            <h3 className="text-base sm:text-lg font-bold text-black">Add New Partnership</h3>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-1 rounded-lg hover:bg-black/10 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
            {/* Partnership Type */}
            <div>
              <label className="block text-sm font-medium text-black mb-2 sm:mb-3">
                Partnership Type
              </label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {PARTNERSHIP_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleChange('type', type.value)}
                    className={`flex items-start p-2.5 sm:p-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                      formData.type === type.value
                        ? 'border-[#F1E271] bg-[#F1E271]/10'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <type.icon
                      className={`h-4 w-4 sm:h-5 sm:w-5 mt-0.5 mr-2 sm:mr-3 flex-shrink-0 ${
                        formData.type === type.value ? 'text-black' : 'text-black'
                      }`}
                    />
                    <div className="min-w-0">
                      <p
                        className={`font-medium text-sm sm:text-base ${
                          formData.type === type.value ? 'text-black' : 'text-black'
                        }`}
                      >
                        {type.label}
                      </p>
                      <p className="text-xs text-black mt-0.5 hidden sm:block">{type.description}</p>
                    </div>
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
                className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Contact Name *
                </label>
                <input
                  type="text"
                  value={formData.contact_name}
                  onChange={(e) => handleChange('contact_name', e.target.value)}
                  placeholder="John Doe"
                  className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] ${
                    errors.contact_name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.contact_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.contact_name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="john@example.com"
                  className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] ${
                    errors.contact_email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.contact_email && (
                  <p className="text-red-500 text-sm mt-1">{errors.contact_email}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleChange('contact_phone', e.target.value)}
                placeholder="+41 79 123 4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271]"
              />
            </div>

            {/* Company Information (for company/sponsor types) */}
            {(formData.type === 'company' || formData.type === 'sponsor') && (
              <>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => handleChange('company_name', e.target.value)}
                    placeholder="Acme Inc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">
                    Company Website
                  </label>
                  <input
                    type="url"
                    value={formData.company_website}
                    onChange={(e) => handleChange('company_website', e.target.value)}
                    placeholder="https://example.com"
                    className={`w-full px-3 py-2 border rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] ${
                      errors.company_website ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.company_website && (
                    <p className="text-red-500 text-sm mt-1">{errors.company_website}</p>
                  )}
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Any additional notes about this partnership..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black placeholder-gray-500 focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271]"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-black bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#E5D665] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Creating...' : 'Create Partnership'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
