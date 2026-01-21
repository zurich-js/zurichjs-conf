/**
 * Invoice Actions Section - Status change actions for B2B invoice
 */

import { useState } from 'react';
import type { B2BInvoiceWithAttendees, B2BInvoiceStatus } from '@/lib/types/b2b';
import { MarkAsPaidModal } from '../MarkAsPaidModal';

interface ActionsSectionProps {
  invoice: B2BInvoiceWithAttendees;
  onUpdate: () => void;
  setError: (error: string | null) => void;
}

export function ActionsSection({ invoice, onUpdate, setError }: ActionsSectionProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);

  const handleStatusUpdate = async (newStatus: B2BInvoiceStatus) => {
    setActionLoading(newStatus);
    setError(null);

    try {
      const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update status');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const canMarkAsPaid = invoice.attendees.length === invoice.ticket_quantity;

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Status Actions</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {invoice.status === 'draft' && (
          <>
            <button
              onClick={() => handleStatusUpdate('sent')}
              disabled={!!actionLoading}
              className="px-4 py-2.5 bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#e6d766] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === 'sent' ? 'Updating...' : 'Mark as Sent'}
            </button>
            <button
              onClick={() => handleStatusUpdate('cancelled')}
              disabled={!!actionLoading}
              className="px-4 py-2.5 bg-white text-red-600 font-medium border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === 'cancelled' ? 'Updating...' : 'Cancel Invoice'}
            </button>
          </>
        )}

        {invoice.status === 'sent' && (
          <>
            <button
              onClick={() => setShowMarkAsPaidModal(true)}
              disabled={!!actionLoading || !canMarkAsPaid}
              className="px-4 py-2.5 bg-green-700 text-white font-medium rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Mark as Paid & Create Tickets
            </button>
            <button
              onClick={() => handleStatusUpdate('cancelled')}
              disabled={!!actionLoading}
              className="px-4 py-2.5 bg-white text-red-600 font-medium border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {actionLoading === 'cancelled' ? 'Updating...' : 'Cancel Invoice'}
            </button>
          </>
        )}

        {(invoice.status === 'paid' || invoice.status === 'cancelled') && (
          <p className="col-span-1 sm:col-span-2 text-gray-900 text-center py-4">
            No actions available for {invoice.status} invoices.
          </p>
        )}
      </div>

      {invoice.status === 'sent' && !canMarkAsPaid && (
        <p className="text-sm text-amber-900 bg-amber-100 px-3 py-2 rounded-lg">
          Add all {invoice.ticket_quantity} attendees before marking as paid.
        </p>
      )}

      {/* Mark as Paid Modal */}
      {showMarkAsPaidModal && (
        <MarkAsPaidModal
          invoice={invoice}
          onClose={() => setShowMarkAsPaidModal(false)}
          onSuccess={() => {
            setShowMarkAsPaidModal(false);
            onUpdate();
          }}
        />
      )}
    </div>
  );
}
