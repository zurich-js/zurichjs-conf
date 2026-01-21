/**
 * Invoice Details Section - View and edit invoice details
 */

import { useState, useCallback } from 'react';
import type { B2BInvoiceWithAttendees } from '@/lib/types/b2b';
import { formatAmount, formatDate } from '../types';
import { getFormValuesFromInvoice, type EditFormData } from './types';

interface DetailsSectionProps {
  invoice: B2BInvoiceWithAttendees;
  onUpdate: () => void;
  setError: (error: string | null) => void;
}

export function DetailsSection({ invoice, onUpdate, setError }: DetailsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>(() => getFormValuesFromInvoice(invoice));

  const startEditing = useCallback(() => {
    setEditFormData(getFormValuesFromInvoice(invoice));
    setIsEditing(true);
  }, [invoice]);

  const handleSaveEdit = async () => {
    setActionLoading('save');
    setError(null);

    try {
      const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactName: editFormData.contactName,
          contactEmail: editFormData.contactEmail,
          companyName: editFormData.companyName,
          vatId: editFormData.vatId || undefined,
          billingAddress: {
            street: editFormData.billingAddressStreet,
            city: editFormData.billingAddressCity,
            postalCode: editFormData.billingAddressPostalCode,
            country: editFormData.billingAddressCountry,
          },
          dueDate: editFormData.dueDate,
          notes: editFormData.notes,
          invoiceNotes: editFormData.invoiceNotes,
          ticketQuantity: editFormData.ticketQuantity,
          unitPrice: editFormData.unitPrice,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update invoice');
      }

      setIsEditing(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update invoice');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGeneratePDF = async () => {
    setActionLoading('pdf');
    setError(null);

    try {
      const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}/pdf/generate`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate PDF');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegeneratePDF = async () => {
    if (!confirm('This will regenerate the PDF with current invoice details. Continue?')) return;
    setActionLoading('pdf');
    setError(null);
    try {
      await fetch(`/api/admin/b2b-invoices/${invoice.id}/pdf`, { method: 'DELETE' });
      const genRes = await fetch(`/api/admin/b2b-invoices/${invoice.id}/pdf/generate`, { method: 'POST' });
      if (!genRes.ok) throw new Error('Failed to generate new PDF');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate PDF');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateStripeLink = async () => {
    setActionLoading('stripe');
    setError(null);
    try {
      const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}/stripe-link`, { method: 'POST' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate payment link');
      }
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate payment link');
    } finally {
      setActionLoading(null);
    }
  };

  if (isEditing) {
    return (
      <EditForm
        formData={editFormData}
        setFormData={setEditFormData}
        onSave={handleSaveEdit}
        onCancel={() => setIsEditing(false)}
        loading={actionLoading === 'save'}
      />
    );
  }

  return (
    <div className="space-y-6">
      {(invoice.status === 'draft' || invoice.status === 'sent') && (
        <div className="flex justify-end">
          <button onClick={startEditing} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer text-gray-900">
            Edit Details
          </button>
        </div>
      )}

      {/* Invoice Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Bill To</h4>
          <div className="text-sm text-gray-900 space-y-1">
            <p className="font-medium">{invoice.company_name}</p>
            <p>{invoice.contact_name}</p>
            <p className="text-gray-700">{invoice.contact_email}</p>
            <p>{invoice.billing_address_street}</p>
            <p>{invoice.billing_address_postal_code} {invoice.billing_address_city}</p>
            <p>{invoice.billing_address_country}</p>
            {invoice.vat_id && <p>VAT: {invoice.vat_id}</p>}
          </div>
        </div>
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Invoice Details</h4>
          <div className="text-sm space-y-1 text-gray-900">
            <div className="flex justify-between"><span>Issue Date</span><span>{formatDate(invoice.issue_date)}</span></div>
            <div className="flex justify-between"><span>Due Date</span><span>{formatDate(invoice.due_date)}</span></div>
            <div className="flex justify-between"><span>Tickets</span><span>{invoice.ticket_quantity}x {invoice.ticket_category}</span></div>
            <div className="flex justify-between"><span>Payment Method</span><span className="capitalize">{invoice.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Stripe'}</span></div>
          </div>
        </div>
      </div>

      {/* Stripe Payment Link */}
      {invoice.payment_method === 'stripe' && (
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Stripe Payment Link</h4>
          {invoice.stripe_payment_link_url ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-gray-700">Payment link ready</span>
              <a href={invoice.stripe_payment_link_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm bg-[#635BFF] text-white rounded-lg font-medium hover:bg-[#5046e5] transition-colors cursor-pointer">
                Open Payment Link
              </a>
              <button onClick={() => { navigator.clipboard.writeText(invoice.stripe_payment_link_url || ''); alert('Payment link copied!'); }} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer text-gray-900">
                Copy Link
              </button>
            </div>
          ) : (
            <button onClick={handleGenerateStripeLink} disabled={actionLoading === 'stripe'} className="px-3 py-1.5 text-sm bg-[#635BFF] text-white rounded-lg font-medium hover:bg-[#5046e5] transition-colors disabled:opacity-50 cursor-pointer">
              {actionLoading === 'stripe' ? 'Generating...' : 'Generate Payment Link'}
            </button>
          )}
        </div>
      )}

      {/* Notes */}
      {(invoice.notes || invoice.invoice_notes) && (
        <div className="space-y-4">
          {invoice.notes && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Internal Notes <span className="text-gray-500 font-normal ml-1 text-sm">(admin only)</span></h4>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{invoice.notes}</p>
            </div>
          )}
          {invoice.invoice_notes && (
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Invoice Notes <span className="text-gray-500 font-normal ml-1 text-sm">(on PDF)</span></h4>
              <p className="text-sm text-gray-900 bg-amber-50 p-3 rounded-lg border border-amber-200">{invoice.invoice_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Totals */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-2 text-sm text-gray-900">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatAmount(invoice.subtotal, invoice.currency)}</span></div>
          {invoice.vat_rate > 0 && <div className="flex justify-between"><span>VAT ({invoice.vat_rate}%)</span><span>{formatAmount(invoice.vat_amount, invoice.currency)}</span></div>}
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300"><span>Total</span><span>{formatAmount(invoice.total_amount, invoice.currency)}</span></div>
        </div>
      </div>

      {/* PDF Section */}
      <div>
        <h4 className="font-medium text-gray-900 mb-2">Invoice PDF</h4>
        {invoice.invoice_pdf_url ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-700">PDF attached ({invoice.invoice_pdf_source})</span>
            <a href={invoice.invoice_pdf_url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm bg-[#F1E271] text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors cursor-pointer">
              Download PDF
            </a>
            <button onClick={handleRegeneratePDF} disabled={actionLoading === 'pdf'} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer text-gray-900">
              {actionLoading === 'pdf' ? 'Regenerating...' : 'Regenerate PDF'}
            </button>
          </div>
        ) : (
          <button onClick={handleGeneratePDF} disabled={actionLoading === 'pdf'} className="px-3 py-1.5 text-sm bg-[#F1E271] text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors disabled:opacity-50 cursor-pointer">
            {actionLoading === 'pdf' ? 'Generating...' : 'Generate PDF'}
          </button>
        )}
      </div>
    </div>
  );
}

// Edit Form Sub-component
function EditForm({ formData, setFormData, onSave, onCancel, loading }: {
  formData: EditFormData;
  setFormData: (data: EditFormData) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const update = <K extends keyof EditFormData>(key: K, value: EditFormData[K]) => setFormData({ ...formData, [key]: value });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">Company Name</label>
          <input type="text" value={formData.companyName} onChange={(e) => update('companyName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Contact Name</label>
          <input type="text" value={formData.contactName} onChange={(e) => update('contactName', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Contact Email</label>
          <input type="email" value={formData.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">VAT ID</label>
          <input type="text" value={formData.vatId} onChange={(e) => update('vatId', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Due Date</label>
          <input type="date" value={formData.dueDate} onChange={(e) => update('dueDate', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900" />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">Street</label>
          <input type="text" value={formData.billingAddressStreet} onChange={(e) => update('billingAddressStreet', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">City</label>
          <input type="text" value={formData.billingAddressCity} onChange={(e) => update('billingAddressCity', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Postal Code</label>
          <input type="text" value={formData.billingAddressPostalCode} onChange={(e) => update('billingAddressPostalCode', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Country</label>
          <input type="text" value={formData.billingAddressCountry} onChange={(e) => update('billingAddressCountry', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Ticket Quantity</label>
          <input type="number" min={1} value={formData.ticketQuantity} onChange={(e) => update('ticketQuantity', parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Unit Price (CHF)</label>
          <input type="number" min={0} step={0.01} value={formData.unitPrice / 100} onChange={(e) => update('unitPrice', Math.round(parseFloat(e.target.value) * 100) || 0)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900" />
          <p className="mt-1 text-xs text-gray-600">Total: {formatAmount(formData.unitPrice * formData.ticketQuantity)}</p>
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">Internal Notes <span className="text-gray-500 font-normal ml-1">(admin only)</span></label>
          <textarea value={formData.notes} onChange={(e) => update('notes', e.target.value)} rows={2} placeholder="Private notes..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900 placeholder:text-gray-500" />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-sm font-medium text-gray-900 mb-1">Invoice Notes <span className="text-gray-500 font-normal ml-1">(on PDF)</span></label>
          <textarea value={formData.invoiceNotes} onChange={(e) => update('invoiceNotes', e.target.value)} rows={2} placeholder="Payment terms..." className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] text-gray-900 placeholder:text-gray-500" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer">Cancel</button>
        <button onClick={onSave} disabled={loading} className="px-4 py-2 bg-[#F1E271] text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors disabled:opacity-50 cursor-pointer">
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
