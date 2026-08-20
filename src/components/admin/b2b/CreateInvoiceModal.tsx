/**
 * Create Invoice Modal - Form for creating new B2B invoices
 */

import { useState } from 'react';
import type { WorkshopItemInput } from '@/lib/types/b2b';
import { formatAmount } from './types';
import { WorkshopItemsEditor } from './WorkshopItemsEditor';

interface CreateInvoiceModalProps {
  onClose: () => void;
  onCreated: () => void;
}

/** What an invoice bills: conference tickets (optionally with workshops), or workshops alone */
type InvoiceContents = 'tickets' | 'workshops_only';

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
  ticketStage: 'blind_bird' | 'early_bird' | 'general_admission' | 'late_bird' | 'last_minute';
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
  const [workshopItems, setWorkshopItems] = useState<WorkshopItemInput[]>([]);
  const [contents, setContents] = useState<InvoiceContents>('tickets');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A workshop-only invoice bills workshop seats and creates no tickets — for
  // companies that already bought their conference tickets.
  const workshopOnly = contents === 'workshops_only';
  const ticketsTotal = workshopOnly ? 0 : formData.unitPrice * formData.ticketQuantity;
  const workshopsTotal = workshopItems.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const total = ticketsTotal + workshopsTotal;
  const missingWorkshops = workshopOnly && workshopItems.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (missingWorkshops) {
      setError('Add at least one workshop to a workshops-only invoice');
      return;
    }

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
          ticketCategory: workshopOnly ? undefined : formData.ticketCategory,
          ticketStage: workshopOnly ? undefined : formData.ticketStage,
          ticketQuantity: workshopOnly ? 0 : formData.ticketQuantity,
          unitPrice: workshopOnly ? 0 : formData.unitPrice,
          workshopItems: workshopItems.length > 0 ? workshopItems : undefined,
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

          {/* What the invoice bills */}
          <FormSection title="Invoice Contents">
            <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <legend className="sr-only">Invoice contents</legend>
              <ContentsOption
                value="tickets"
                selected={contents}
                onSelect={setContents}
                label="Conference tickets"
                hint="Tickets, optionally with workshop seats"
              />
              <ContentsOption
                value="workshops_only"
                selected={contents}
                onSelect={setContents}
                label="Workshops only"
                hint="No tickets — for companies that already have them"
              />
            </fieldset>
          </FormSection>

          {/* Ticket Configuration */}
          {!workshopOnly && (
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
                    { value: 'last_minute', label: 'Last Minute' },
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-gray-900"
                  />
                </div>
              </div>
            </FormSection>
          )}

          {/* Workshop Seats */}
          <FormSection title={workshopOnly ? 'Workshop Seats *' : 'Workshop Seats'}>
            <WorkshopItemsEditor items={workshopItems} onChange={setWorkshopItems} />
            {missingWorkshops && (
              <p className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded">
                A workshops-only invoice needs at least one workshop.
              </p>
            )}
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
            <div className="space-y-1 text-sm text-gray-900">
              {!workshopOnly && (
                <div className="flex justify-between">
                  <span>{formData.ticketQuantity}x conference ticket</span>
                  <span>{formatAmount(ticketsTotal)}</span>
                </div>
              )}
              {workshopItems.map((item) => (
                <div key={item.workshopId} className="flex justify-between">
                  <span>{item.quantity}x {item.title}</span>
                  <span>{formatAmount(item.unitPrice * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 mt-2 border-t border-gray-300">
              <span>Total</span>
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
              disabled={submitting || missingWorkshops}
              className="px-4 py-2 bg-brand-primary text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
function ContentsOption({
  value,
  selected,
  onSelect,
  label,
  hint,
}: {
  value: InvoiceContents;
  selected: InvoiceContents;
  onSelect: (value: InvoiceContents) => void;
  label: string;
  hint: string;
}) {
  const isSelected = selected === value;
  return (
    <label
      className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'border-brand-primary bg-brand-primary/5' : 'border-gray-300 hover:bg-gray-50'
      }`}
    >
      <input
        type="radio"
        name="invoiceContents"
        value={value}
        checked={isSelected}
        onChange={() => onSelect(value)}
        className="mt-0.5 h-4 w-4 text-brand-primary border-gray-300 focus:ring-brand-primary cursor-pointer"
      />
      <span>
        <span className="block text-sm font-medium text-gray-900">{label}</span>
        <span className="block text-xs text-gray-600">{hint}</span>
      </span>
    </label>
  );
}

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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-gray-900 placeholder:text-gray-500"
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-gray-900 cursor-pointer"
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
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary text-gray-900 placeholder:text-gray-500"
      />
    </div>
  );
}
