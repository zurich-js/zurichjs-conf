/**
 * Invoices Tab Component
 * Admin-managed invoice tracking for speaker travel expenses
 */

import { Pagination } from '@/components/atoms';
import type { InvoiceWithSpeaker } from '@/lib/cfp/admin-travel';
import type { CfpReimbursementStatus } from '@/lib/types/cfp';
import { STATUS_COLORS } from './types';

interface InvoicesTabProps {
  invoices: InvoiceWithSpeaker[];
  filteredInvoices: InvoiceWithSpeaker[];
  isLoading: boolean;
  filter: CfpReimbursementStatus | 'all';
  setFilter: (status: CfpReimbursementStatus | 'all') => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onMarkPaid: (id: string) => void;
  onDelete: (id: string) => void;
  isUpdating: boolean;
}

export function InvoicesTab({
  filteredInvoices,
  isLoading,
  filter,
  setFilter,
  currentPage,
  onPageChange,
  pageSize,
  onApprove,
  onReject,
  onMarkPaid,
  onDelete,
  isUpdating,
}: InvoicesTabProps) {
  const totalPages = Math.ceil(filteredInvoices.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + pageSize);

  const totalsByCurrency: Record<string, number> = {};
  filteredInvoices.forEach((inv) => {
    const cur = inv.currency || 'CHF';
    totalsByCurrency[cur] = (totalsByCurrency[cur] || 0) + inv.amount;
  });
  const totalDisplay = Object.entries(totalsByCurrency)
    .map(([cur, amount]) => `${cur} ${(amount / 100).toFixed(2)}`)
    .join(' + ') || 'CHF 0.00';

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-black">Invoices</h2>
            <p className="text-sm text-gray-500">
              {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''}
              {' · '}Total: {totalDisplay}
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'pending', 'approved', 'rejected', 'paid'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  filter === status ? 'bg-brand-primary text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : paginatedInvoices.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No invoices found</p>
        </div>
      ) : (
        paginatedInvoices.map((invoice) => {
          const metadata = (invoice.metadata || {}) as Record<string, unknown>;
          return (
            <div key={invoice.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between sm:justify-start gap-3 mb-2">
                    <span className="font-medium text-gray-900">
                      {invoice.speaker.first_name} {invoice.speaker.last_name}
                    </span>
                    <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[invoice.status]}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span className="capitalize">{invoice.expense_type}</span> - {invoice.description}
                  </div>
                  {/* Amount on mobile */}
                  <div className="sm:hidden text-xl font-bold text-gray-900 my-2">
                    {invoice.currency} {(invoice.amount / 100).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400 flex flex-wrap gap-3">
                    {'invoice_number' in metadata && <span>Invoice #{String(metadata.invoice_number)}</span>}
                    {'invoice_date' in metadata && <span>Dated {String(metadata.invoice_date)}</span>}
                    <span>Added {new Date(invoice.created_at).toLocaleDateString()}</span>
                    {invoice.paid_at && <span className="text-green-600">Paid {new Date(invoice.paid_at).toLocaleDateString()}</span>}
                  </div>
                  {invoice.receipt_url && (
                    <a
                      href={invoice.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
                    >
                      View PDF
                    </a>
                  )}
                  {invoice.admin_notes && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="text-gray-400">Note:</span> {invoice.admin_notes}
                      </p>
                    </div>
                  )}
                </div>
                <div className="sm:text-right">
                  {/* Amount on desktop */}
                  <div className="hidden sm:block text-2xl font-bold text-gray-900">
                    {invoice.currency} {(invoice.amount / 100).toFixed(2)}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 sm:mt-4">
                    {invoice.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onApprove(invoice.id)}
                          disabled={isUpdating}
                          className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onReject(invoice.id)}
                          disabled={isUpdating}
                          className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {invoice.status === 'approved' && (
                      <button
                        onClick={() => onMarkPaid(invoice.id)}
                        disabled={isUpdating}
                        className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Mark as Paid
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm('Delete this invoice?')) onDelete(invoice.id);
                      }}
                      disabled={isUpdating}
                      className="px-4 py-2 border border-red-300 hover:bg-red-50 text-red-600 font-medium rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        totalItems={filteredInvoices.length}
        variant="light"
      />
    </div>
  );
}
