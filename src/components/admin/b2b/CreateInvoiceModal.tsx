/**
 * Create Invoice Modal - Form for creating new B2B invoices
 */

import { useState } from 'react';
import { formatAmount } from './types';

interface CreateInvoiceModalProps {
  onClose: () => void;
  onCreated: () => void;
}

interface FormData {
  companyName: string;
  vatId: string;
  contactName: string;
  contactEmail: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  dueDate: string;
  notes: string;
  invoiceNotes: string;
  paymentMethod: 'bank_transfer' | 'stripe';
  ticketCategory: 'standard' | 'student' | 'unemployed' | 'vip';
  ticketStage: 'blind_bird' | 'early_bird' | 'general_admission' | 'late_bird';
  ticketQuantity: number;
  unitPrice: number;
}

const initialFormData: FormData = {
  companyName: '',
  vatId: '',
  contactName: '',
  contactEmail: '',
  street: '',
  city: '',
  postalCode: '',
  country: 'Switzerland',
  dueDate: '',
  notes: '',
  invoiceNotes: '',
  paymentMethod: 'bank_transfer',
  ticketCategory: 'standard',
  ticketStage: 'general_admission',
  ticketQuantity: 1,
  unitPrice: 0,
};

export function CreateInvoiceModal({ onClose, onCreated }: CreateInvoiceModalProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = formData.unitPrice * formData.ticketQuantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/b2b-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          vatId: formData.vatId || undefined,
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          billingAddress: {
            street: formData.street,
            city: formData.city,
            postalCode: formData.postalCode,
            country: formData.country,
          },
          dueDate: formData.dueDate,
          notes: formData.notes || undefined,
          invoiceNotes: formData.invoiceNotes || undefined,
          paymentMethod: formData.paymentMethod,
          ticketCategory: formData.ticketCategory,
          ticketStage: formData.ticketStage,
          ticketQuantity: formData.ticketQuantity,
          unitPrice: formData.unitPrice,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create invoice');
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData({ ...formData, [key]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Create B2B Invoice</h3>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900 cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Company Details */}
          <FormSection title="Company Details">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FormInput label="Company Name *" value={formData.companyName} onChange={(v) => updateField('companyName', v)} required />
              </div>
              <FormInput label="VAT ID" value={formData.vatId} onChange={(v) => updateField('vatId', v)} placeholder="CHE-123.456.789" />
            </div>
          </FormSection>

          {/* Billing Address */}
          <FormSection title="Billing Address">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <FormInput label="Street *" value={formData.street} onChange={(v) => updateField('street', v)} required />
              </div>
              <FormInput label="City *" value={formData.city} onChange={(v) => updateField('city', v)} required />
              <FormInput label="Postal Code *" value={formData.postalCode} onChange={(v) => updateField('postalCode', v)} required />
              <FormInput label="Country *" value={formData.country} onChange={(v) => updateField('country', v)} required />
            </div>
          </FormSection>

          {/* Contact */}
          <FormSection title="Contact Person">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Name *" value={formData.contactName} onChange={(v) => updateField('contactName', v)} required />
              <FormInput label="Email *" value={formData.contactEmail} onChange={(v) => updateField('contactEmail', v)} type="email" required />
            </div>
          </FormSection>

          {/* Ticket Configuration */}
          <FormSection title="Ticket Configuration">
            <div className="grid grid-cols-2 gap-4">
              <FormSelect
                label="Category *"
                value={formData.ticketCategory}
                onChange={(v) => updateField('ticketCategory', v as FormData['ticketCategory'])}
                options={[
                  { value: 'standard', label: 'Standard' },
                  { value: 'student', label: 'Student' },
                  { value: 'unemployed', label: 'Job Seeker' },
                  { value: 'vip', label: 'VIP' },
                ]}
              />
              <FormSelect
                label="Stage *"
                value={formData.ticketStage}
                onChange={(v) => updateField('ticketStage', v as FormData['ticketStage'])}
                options={[
                  { value: 'blind_bird', label: 'Blind Bird' },
                  { value: 'early_bird', label: 'Early Bird' },
                  { value: 'general_admission', label: 'General Admission' },
                  { value: 'late_bird', label: 'Late Bird' },
                ]}
              />
              <FormInput
                label="Quantity *"
                type="number"
                value={formData.ticketQuantity.toString()}
                onChange={(v) => updateField('ticketQuantity', parseInt(v) || 1)}
                min={1}
                required
              />
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Unit Price (CHF) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={0.01}
                  value={formData.unitPrice / 100}
                  onChange={(e) => updateField('unitPrice', Math.round(parseFloat(e.target.value) * 100) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                />
              </div>
            </div>
          </FormSection>

          {/* Invoice Settings */}
          <FormSection title="Invoice Settings">
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Due Date *" type="date" value={formData.dueDate} onChange={(v) => updateField('dueDate', v)} required />
              <FormSelect
                label="Payment Method *"
                value={formData.paymentMethod}
                onChange={(v) => updateField('paymentMethod', v as FormData['paymentMethod'])}
                options={[
                  { value: 'bank_transfer', label: 'Bank Transfer' },
                  { value: 'stripe', label: 'Stripe Payment Link' },
                ]}
              />
              <div className="col-span-2">
                <FormTextarea
                  label="Internal Notes"
                  hint="(admin only, not on invoice)"
                  value={formData.notes}
                  onChange={(v) => updateField('notes', v)}
                  placeholder="Private notes about this order, customer preferences, etc..."
                />
              </div>
              <div className="col-span-2">
                <FormTextarea
                  label="Invoice Notes"
                  hint="(displayed on the PDF invoice)"
                  value={formData.invoiceNotes}
                  onChange={(v) => updateField('invoiceNotes', v)}
                  placeholder="Payment terms, special conditions, thank you message..."
                />
              </div>
            </div>
          </FormSection>

          {/* Total Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Invoice Total</h4>
            <div className="flex justify-between font-bold text-lg text-gray-900">
              <span>Total ({formData.ticketQuantity} tickets)</span>
              <span>{formatAmount(total)}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#F1E271] text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Creating...' : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper Components
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-3">{title}</h4>
      {children}
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  min,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function FormTextarea({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-900 mb-1">
        {label}
        {hint && <span className="text-gray-500 font-normal ml-1">{hint}</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
      />
    </div>
  );
}
