/**
 * Add Sponsor Modal Component
 * Form for creating a new sponsor with optional initial deal
 */

import React, { useState, useEffect } from 'react';
import { X, Building2, User, MapPin, Plus } from 'lucide-react';
import type { CreateSponsorFormData, CreateDealFormData, SponsorshipTier, SponsorshipCurrency } from './types';

interface AddSponsorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSponsor: (data: CreateSponsorFormData) => Promise<{ id: string }>;
  onCreateDeal?: (data: CreateDealFormData) => Promise<void>;
  tiers: SponsorshipTier[];
}

const initialFormData: CreateSponsorFormData = {
  companyName: '',
  companyWebsite: '',
  vatId: '',
  billingAddress: {
    street: '',
    city: '',
    postalCode: '',
    country: 'Switzerland',
  },
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  internalNotes: '',
};

export function AddSponsorModal({
  isOpen,
  onClose,
  onCreateSponsor,
  onCreateDeal,
  tiers,
}: AddSponsorModalProps) {
  const [formData, setFormData] = useState<CreateSponsorFormData>(initialFormData);
  const [createDealAfter, setCreateDealAfter] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>(tiers[0]?.id || '');
  const [selectedCurrency, setSelectedCurrency] = useState<SponsorshipCurrency>('CHF');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update selectedTier when tiers load (fixes race condition)
  useEffect(() => {
    if (tiers.length > 0 && !selectedTier) {
      setSelectedTier(tiers[0].id);
    }
  }, [tiers, selectedTier]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Create sponsor
      const sponsor = await onCreateSponsor(formData);

      // Create deal if requested
      if (createDealAfter && onCreateDeal && selectedTier) {
        await onCreateDeal({
          sponsorId: sponsor.id,
          tierId: selectedTier,
          currency: selectedCurrency,
          internalNotes: '',
        });
      }

      // Reset form and close
      setFormData(initialFormData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create sponsor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof CreateSponsorFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateAddress = (field: keyof CreateSponsorFormData['billingAddress'], value: string) => {
    setFormData((prev) => ({
      ...prev,
      billingAddress: { ...prev.billingAddress, [field]: value },
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Add New Sponsor</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Company Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Building2 className="h-4 w-4" />
              Company Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => updateField('companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="Acme Corp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.companyWebsite}
                  onChange={(e) => updateField('companyWebsite', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  VAT ID
                </label>
                <input
                  type="text"
                  value={formData.vatId}
                  onChange={(e) => updateField('vatId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="CHE-123.456.789"
                />
              </div>
            </div>
          </div>

          {/* Contact Person */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <User className="h-4 w-4" />
              Contact Person
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => updateField('contactName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => updateField('contactEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => updateField('contactPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="+41 44 123 45 67"
                />
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <MapPin className="h-4 w-4" />
              Billing Address
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street *
                </label>
                <input
                  type="text"
                  required
                  value={formData.billingAddress.street}
                  onChange={(e) => updateAddress('street', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="123 Main St"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  required
                  value={formData.billingAddress.city}
                  onChange={(e) => updateAddress('city', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="Zürich"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Postal Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.billingAddress.postalCode}
                  onChange={(e) => updateAddress('postalCode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="8000"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country *
                </label>
                <input
                  type="text"
                  required
                  value={formData.billingAddress.country}
                  onChange={(e) => updateAddress('country', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                  placeholder="Switzerland"
                />
              </div>
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
            </label>
            <textarea
              value={formData.internalNotes}
              onChange={(e) => updateField('internalNotes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent resize-none"
              placeholder="Add any notes (not visible on invoices)"
            />
          </div>

          {/* Create Deal Option */}
          {onCreateDeal && tiers.length > 0 && (
            <div className="border-t border-gray-200 pt-6 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createDealAfter}
                  onChange={(e) => setCreateDealAfter(e.target.checked)}
                  className="rounded border-gray-300 text-[#F1E271] focus:ring-[#F1E271]"
                />
                <span className="text-sm font-medium text-gray-700">
                  Create sponsorship deal immediately
                </span>
              </label>

              {createDealAfter && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tier
                    </label>
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                    >
                      {tiers.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={selectedCurrency}
                      onChange={(e) => setSelectedCurrency(e.target.value as SponsorshipCurrency)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-transparent"
                    >
                      <option value="CHF">CHF</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-sm font-medium text-black bg-[#F1E271] hover:bg-[#e6d766] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Sponsor
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
