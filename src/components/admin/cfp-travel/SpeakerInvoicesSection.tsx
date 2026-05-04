/**
 * Speaker Invoices Section
 * Manage invoices for a speaker within the detail modal
 */

import { useState, useRef } from 'react';
import { FileText, Plus, Upload, ExternalLink, Trash2 } from 'lucide-react';
import type { CfpSpeakerReimbursement, CfpReimbursementType } from '@/lib/types/cfp';
import { STATUS_COLORS } from './types';

interface SpeakerInvoicesSectionProps {
  invoices: CfpSpeakerReimbursement[];
  speakerId: string;
  onCreateInvoice: (data: Record<string, unknown>) => void;
  onUpdateInvoice: (invoiceId: string, data: Record<string, unknown>) => void;
  onDeleteInvoice: (invoiceId: string) => void;
  onUploadPdf: (invoiceId: string, file: File) => void;
  isSubmitting: boolean;
}

const EXPENSE_TYPES: { value: CfpReimbursementType; label: string }[] = [
  { value: 'flight', label: 'Flight' },
  { value: 'accommodation', label: 'Hotel' },
  { value: 'transport', label: 'Transport' },
  { value: 'other', label: 'Other' },
];

interface InvoiceFormData {
  expense_type: CfpReimbursementType;
  description: string;
  amount: string;
  currency: string;
  invoice_number: string;
  invoice_date: string;
  admin_notes: string;
}

const EMPTY_FORM: InvoiceFormData = {
  expense_type: 'flight',
  description: '',
  amount: '',
  currency: 'CHF',
  invoice_number: '',
  invoice_date: '',
  admin_notes: '',
};

export function SpeakerInvoicesSection({
  invoices,
  speakerId,
  onCreateInvoice,
  onUpdateInvoice,
  onDeleteInvoice,
  onUploadPdf,
  isSubmitting,
}: SpeakerInvoicesSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<InvoiceFormData>(EMPTY_FORM);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleSubmit = () => {
    const amountCents = Math.round(parseFloat(form.amount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) return;

    onCreateInvoice({
      speaker_id: speakerId,
      expense_type: form.expense_type,
      description: form.description,
      amount: amountCents,
      currency: form.currency,
      invoice_number: form.invoice_number || undefined,
      invoice_date: form.invoice_date || undefined,
      admin_notes: form.admin_notes || undefined,
    });
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleStatusChange = (invoiceId: string, status: string) => {
    onUpdateInvoice(invoiceId, { status });
  };

  const handleDelete = (invoiceId: string) => {
    if (confirm('Delete this invoice?')) {
      onDeleteInvoice(invoiceId);
    }
  };

  const handleFileUpload = (invoiceId: string) => {
    setUploadingId(invoiceId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingId) {
      onUploadPdf(uploadingId, file);
      setUploadingId(null);
    }
    e.target.value = '';
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Invoices ({invoices.length})
        </h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-primary text-black hover:bg-[#e8d95e] cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add Invoice
          </button>
        )}
      </div>

      {invoices.length === 0 && !showForm && (
        <p className="text-sm text-gray-500 py-3">No invoices tracked yet.</p>
      )}

      {invoices.map((invoice) => {
        const metadata = (invoice.metadata || {}) as Record<string, unknown>;
        return (
          <div key={invoice.id} className="border border-gray-200 rounded-lg p-3 mb-2">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{invoice.description}</span>
                  <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[invoice.status]}`}>
                    {invoice.status}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-3">
                  <span className="capitalize">{invoice.expense_type}</span>
                  {'invoice_number' in metadata && <span>#{String(metadata.invoice_number)}</span>}
                  {'invoice_date' in metadata && <span>{String(metadata.invoice_date)}</span>}
                  <span>Added {new Date(invoice.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold text-gray-900">
                  {invoice.currency} {(invoice.amount / 100).toFixed(2)}
                </div>
                {invoice.paid_at && (
                  <div className="text-xs text-green-600">Paid {new Date(invoice.paid_at).toLocaleDateString()}</div>
                )}
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {invoice.receipt_url ? (
                <a
                  href={invoice.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  <ExternalLink className="w-3 h-3" /> View PDF
                </a>
              ) : (
                <button
                  onClick={() => handleFileUpload(invoice.id)}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3 h-3" /> Upload PDF
                </button>
              )}
              {invoice.status === 'pending' && (
                <>
                  <button
                    onClick={() => handleStatusChange(invoice.id, 'approved')}
                    disabled={isSubmitting}
                    className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleStatusChange(invoice.id, 'rejected')}
                    disabled={isSubmitting}
                    className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer disabled:opacity-50"
                  >
                    Reject
                  </button>
                </>
              )}
              {invoice.status === 'approved' && (
                <button
                  onClick={() => handleStatusChange(invoice.id, 'paid')}
                  disabled={isSubmitting}
                  className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer disabled:opacity-50"
                >
                  Mark Paid
                </button>
              )}
              <button
                onClick={() => handleDelete(invoice.id)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-600 cursor-pointer ml-auto"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {invoice.admin_notes && (
              <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
                Note: {invoice.admin_notes}
              </div>
            )}
          </div>
        );
      })}

      {showForm && (
        <div className="border border-gray-200 rounded-lg p-4 mt-2 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Add Invoice</h4>
          <div className="space-y-3">
            <div className="flex gap-2">
              {EXPENSE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setForm({ ...form, expense_type: type.value })}
                  className={`px-3 py-1.5 text-xs rounded-lg cursor-pointer ${
                    form.expense_type === type.value
                      ? 'bg-brand-primary text-black font-medium'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
            <input
              placeholder="Description (e.g. Flight London to Zurich)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              >
                <option value="CHF">CHF</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
              </select>
              <input
                placeholder="Invoice #"
                value={form.invoice_number}
                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Admin Notes</label>
                <input
                  placeholder="Optional notes"
                  value={form.admin_notes}
                  onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !form.description || !form.amount}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-brand-primary text-black hover:bg-[#e8d95e] disabled:opacity-50 cursor-pointer"
              >
                Add Invoice
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
