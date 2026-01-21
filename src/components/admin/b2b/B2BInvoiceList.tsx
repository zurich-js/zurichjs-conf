/**
 * B2B Invoice List - Mobile cards and desktop table for invoices
 */

import type { B2BInvoice, B2BInvoiceWithAttendees } from '@/lib/types/b2b';
import { Pagination } from '@/components/atoms';
import { statusColors, formatAmount, formatDate, ITEMS_PER_PAGE } from './types';

interface B2BInvoiceListProps {
  invoices: B2BInvoice[];
  currentPage: number;
  onPageChange: (page: number) => void;
  onSelectInvoice: (invoice: B2BInvoiceWithAttendees) => void;
  onCreateClick: () => void;
}

export function B2BInvoiceList({
  invoices,
  currentPage,
  onPageChange,
  onSelectInvoice,
  onCreateClick,
}: B2BInvoiceListProps) {
  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInvoices = invoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleViewDetails = async (invoiceId: string) => {
    const response = await fetch(`/api/admin/b2b-invoices/${invoiceId}`);
    if (response.ok) {
      const data = await response.json();
      onSelectInvoice(data);
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p className="mt-2 text-gray-700">No invoices found</p>
        <button
          onClick={onCreateClick}
          className="mt-4 px-4 py-2 bg-[#F1E271] text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors cursor-pointer"
        >
          Create First Invoice
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="block md:hidden space-y-4">
        {paginatedInvoices.map((invoice) => (
          <div
            key={invoice.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-medium text-gray-900">{invoice.invoice_number}</p>
                <p className="text-sm text-gray-700">{invoice.company_name}</p>
              </div>
              <span
                className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[invoice.status]}`}
              >
                {invoice.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3 text-gray-900">
              <div>
                <span className="font-medium">Tickets:</span>
                <span className="ml-1">{invoice.ticket_quantity}x {invoice.ticket_category}</span>
              </div>
              <div>
                <span className="font-medium">Due:</span>
                <span className="ml-1">{formatDate(invoice.due_date)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <span className="font-bold text-gray-900">
                {formatAmount(invoice.total_amount, invoice.currency)}
              </span>
              <button
                onClick={() => handleViewDetails(invoice.id)}
                className="px-3 py-1.5 bg-[#F1E271] text-black rounded-lg text-sm font-medium cursor-pointer"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tickets</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    <div>{invoice.company_name}</div>
                    <div className="text-gray-700 text-xs">{invoice.contact_email}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {invoice.ticket_quantity}x {invoice.ticket_category}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {formatAmount(invoice.total_amount, invoice.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${statusColors[invoice.status]}`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {formatDate(invoice.due_date)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewDetails(invoice.id)}
                      className="inline-flex items-center px-3 py-1.5 border border-[#F1E271] rounded-md text-xs font-medium text-black bg-[#F1E271] hover:bg-[#e8d95e] cursor-pointer transition-colors"
                      title="View invoice details"
                    >
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={ITEMS_PER_PAGE}
        totalItems={invoices.length}
        variant="light"
      />
    </>
  );
}
