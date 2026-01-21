/**
 * Mark as Paid Modal - Confirmation dialog for marking B2B invoice as paid
 */

import { useState } from 'react';
import type { B2BInvoiceWithAttendees } from '@/lib/types/b2b';
import { formatAmount } from './types';

interface MarkAsPaidModalProps {
  invoice: B2BInvoiceWithAttendees;
  onClose: () => void;
  onSuccess: () => void;
}

interface MarkAsPaidResult {
  success: boolean;
  ticketsCreated: number;
  emailsSent: number;
  emailsFailed: number;
  tickets: Array<{ attendeeName: string; attendeeEmail: string; ticketId: string }>;
  emailFailures?: Array<{ attendeeEmail: string; attendeeName: string; reason: string }>;
}

export function MarkAsPaidModal({ invoice, onClose, onSuccess }: MarkAsPaidModalProps) {
  const [bankReference, setBankReference] = useState('');
  const [sendEmails, setSendEmails] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MarkAsPaidResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed || !bankReference.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankTransferReference: bankReference.trim(),
          sendConfirmationEmails: sendEmails,
          confirmTicketCreation: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark invoice as paid');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark invoice as paid');
    } finally {
      setSubmitting(false);
    }
  };

  // Success screen
  if (result) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Confirmed!</h3>
            <p className="text-gray-700 mb-4">
              Invoice {invoice.invoice_number} has been marked as paid.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Tickets Created:</div>
                <div className="font-medium text-gray-900">{result.ticketsCreated}</div>
                <div className="text-gray-600">Emails Sent:</div>
                <div className="font-medium text-gray-900">{result.emailsSent}</div>
                {result.emailsFailed > 0 && (
                  <>
                    <div className="text-gray-600">Emails Failed:</div>
                    <div className="font-medium text-red-600">{result.emailsFailed}</div>
                  </>
                )}
              </div>
            </div>

            {result.tickets.length > 0 && (
              <div className="text-left mb-6">
                <h4 className="font-medium text-gray-900 mb-2 text-sm">Created Tickets:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.tickets.map((ticket) => (
                    <div key={ticket.ticketId} className="text-xs bg-green-50 p-2 rounded flex justify-between items-center">
                      <span className="text-gray-900">{ticket.attendeeName}</span>
                      <span className="text-gray-600 font-mono">{ticket.ticketId.slice(0, 8)}...</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.emailFailures && result.emailFailures.length > 0 && (
              <div className="text-left mb-6">
                <h4 className="font-medium text-red-700 mb-2 text-sm">Email Failures:</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {result.emailFailures.map((failure, idx) => (
                    <div key={idx} className="text-xs bg-red-50 p-2 rounded border border-red-200">
                      <div className="font-medium text-red-800">{failure.attendeeName}</div>
                      <div className="text-red-600">{failure.attendeeEmail}</div>
                      <div className="text-red-700 mt-1">Reason: {failure.reason}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  Tickets were still created. You can resend emails later from the attendees list.
                </p>
              </div>
            )}

            <button
              onClick={onSuccess}
              className="w-full px-4 py-2.5 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Mark Invoice as Paid</h3>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900 cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Invoice Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Invoice Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-600">Invoice:</div>
              <div className="font-medium text-gray-900">{invoice.invoice_number}</div>
              <div className="text-gray-600">Company:</div>
              <div className="font-medium text-gray-900">{invoice.company_name}</div>
              <div className="text-gray-600">Total Amount:</div>
              <div className="font-medium text-gray-900">{formatAmount(invoice.total_amount, invoice.currency)}</div>
              <div className="text-gray-600">Tickets:</div>
              <div className="font-medium text-gray-900">{invoice.ticket_quantity}x {invoice.ticket_category}</div>
              <div className="text-gray-600">Attendees:</div>
              <div className="font-medium text-gray-900">{invoice.attendees.length} registered</div>
            </div>
          </div>

          {/* Bank Transfer Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">
              Bank Transfer Reference *
            </label>
            <input
              type="text"
              required
              value={bankReference}
              onChange={(e) => setBankReference(e.target.value)}
              placeholder="e.g., PAYMENT-12345 or transaction ID"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 placeholder:text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-600">
              Enter the bank transfer reference or transaction ID for audit purposes.
            </p>
          </div>

          {/* Send Emails Option */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="sendEmails"
              checked={sendEmails}
              onChange={(e) => setSendEmails(e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
            />
            <label htmlFor="sendEmails" className="text-sm text-gray-900 cursor-pointer">
              <span className="font-medium">Send confirmation emails</span>
              <p className="text-gray-600 mt-0.5">
                Each attendee will receive their ticket with a QR code via email.
              </p>
            </label>
          </div>

          {/* Warning Box */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="text-sm">
                <p className="font-medium text-amber-800">This action will:</p>
                <ul className="mt-1 text-amber-700 list-disc list-inside space-y-0.5">
                  <li>Create {invoice.ticket_quantity} tickets in the system</li>
                  <li>Mark the invoice as paid</li>
                  {sendEmails && <li>Send confirmation emails to all attendees</li>}
                </ul>
                <p className="mt-2 font-medium text-amber-800">This cannot be undone.</p>
              </div>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3 p-4 bg-gray-100 rounded-lg">
            <input
              type="checkbox"
              id="confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
            />
            <label htmlFor="confirm" className="text-sm text-gray-900 cursor-pointer">
              <span className="font-medium">
                I confirm that I want to create {invoice.ticket_quantity} tickets and mark this invoice as paid.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !confirmed || !bankReference.trim()}
              className="px-4 py-2.5 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? 'Processing...' : 'Confirm Payment & Create Tickets'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
