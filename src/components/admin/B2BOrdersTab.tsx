/**
 * B2B Orders Tab Component
 * Admin interface for managing B2B invoices and bulk ticket orders
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { B2BInvoice, B2BInvoiceWithAttendees, B2BInvoiceStatus } from '@/lib/types/b2b';
import { Pagination } from '@/components/atoms';

// Status badge colors - using darker text for better contrast
const statusColors: Record<B2BInvoiceStatus, string> = {
  draft: 'bg-gray-200 text-gray-900',
  sent: 'bg-blue-200 text-blue-900',
  paid: 'bg-green-200 text-green-900',
  cancelled: 'bg-red-200 text-red-900',
};

// Format amount from cents to currency
function formatAmount(cents: number, currency: string = 'CHF'): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-CH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const ITEMS_PER_PAGE = 10;

export function B2BOrdersTab() {
  const [invoices, setInvoices] = useState<B2BInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<B2BInvoiceStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<B2BInvoiceWithAttendees | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/b2b-invoices?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch invoices');

      const data = await response.json();
      setInvoices(data.invoices);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Summary stats
  const summaryStats = {
    total: invoices.length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    sent: invoices.filter((i) => i.status === 'sent').length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    totalValue: invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.total_amount, 0),
  };

  // Pagination
  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return invoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [invoices, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">B2B Orders</h2>
          <p className="text-sm text-gray-700 mt-1">
            Manage invoice-based bulk ticket orders for companies
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-[#F1E271] text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors cursor-pointer"
        >
          + Create Invoice
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-700">Total Invoices</p>
          <p className="text-2xl font-bold text-gray-900">{summaryStats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-700">Draft</p>
          <p className="text-2xl font-bold text-gray-800">{summaryStats.draft}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-700">Awaiting Payment</p>
          <p className="text-2xl font-bold text-blue-700">{summaryStats.sent}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-700">Paid</p>
          <p className="text-2xl font-bold text-green-700">{summaryStats.paid}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-700">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">{formatAmount(summaryStats.totalValue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by company name or invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as B2BInvoiceStatus | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-700">Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
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
            onClick={() => setShowCreateModal(true)}
            className="mt-4 px-4 py-2 bg-[#F1E271] text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors cursor-pointer"
          >
            Create First Invoice
          </button>
        </div>
      ) : (
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
                    onClick={async () => {
                      const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}`);
                      if (response.ok) {
                        const data = await response.json();
                        setSelectedInvoice(data);
                      }
                    }}
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Tickets
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                      Actions
                    </th>
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
                          onClick={async () => {
                            const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}`);
                            if (response.ok) {
                              const data = await response.json();
                              setSelectedInvoice(data);
                            }
                          }}
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
            onPageChange={setCurrentPage}
            pageSize={ITEMS_PER_PAGE}
            totalItems={invoices.length}
            variant="light"
          />
        </>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <CreateInvoiceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchInvoices();
          }}
        />
      )}

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onUpdate={() => {
            fetchInvoices();
            // Refresh the selected invoice
            fetch(`/api/admin/b2b-invoices/${selectedInvoice.id}`)
              .then((r) => r.json())
              .then(setSelectedInvoice)
              .catch(() => setSelectedInvoice(null));
          }}
        />
      )}
    </div>
  );
}

// Create Invoice Modal
function CreateInvoiceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    companyName: '',
    vatId: '',
    contactName: '',
    contactEmail: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'Switzerland',
    dueDate: '',
    notes: '', // Internal notes (not shown on invoice)
    invoiceNotes: '', // Notes displayed on the invoice PDF
    paymentMethod: 'bank_transfer' as 'bank_transfer' | 'stripe',
    ticketCategory: 'standard' as const,
    ticketStage: 'general_admission' as const,
    ticketQuantity: 1,
    unitPrice: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate total
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Create B2B Invoice</h3>
            <button onClick={onClose} className="text-gray-600 hover:text-gray-900 cursor-pointer">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
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
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Company Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">VAT ID</label>
                <input
                  type="text"
                  value={formData.vatId}
                  onChange={(e) => setFormData({ ...formData, vatId: e.target.value })}
                  placeholder="CHE-123.456.789"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Billing Address */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Billing Address</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-900 mb-1">Street *</label>
                <input
                  type="text"
                  required
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">City *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Postal Code *
                </label>
                <input
                  type="text"
                  required
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Country *</label>
                <input
                  type="text"
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Contact Person</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Ticket Configuration */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Ticket Configuration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Category *</label>
                <select
                  value={formData.ticketCategory}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ticketCategory: e.target.value as typeof formData.ticketCategory,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 cursor-pointer"
                >
                  <option value="standard">Standard</option>
                  <option value="student">Student</option>
                  <option value="unemployed">Job Seeker</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Stage *</label>
                <select
                  value={formData.ticketStage}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ticketStage: e.target.value as typeof formData.ticketStage,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 cursor-pointer"
                >
                  <option value="blind_bird">Blind Bird</option>
                  <option value="early_bird">Early Bird</option>
                  <option value="general_admission">General Admission</option>
                  <option value="late_bird">Late Bird</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Quantity *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.ticketQuantity}
                  onChange={(e) =>
                    setFormData({ ...formData, ticketQuantity: parseInt(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Unit Price (CHF) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step={0.01}
                  value={formData.unitPrice / 100}
                  onChange={(e) =>
                    setFormData({ ...formData, unitPrice: Math.round(parseFloat(e.target.value) * 100) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Invoice Settings */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Invoice Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Due Date *</label>
                <input
                  type="date"
                  required
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Payment Method *</label>
                <select
                  value={formData.paymentMethod}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentMethod: e.target.value as 'bank_transfer' | 'stripe',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 cursor-pointer"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="stripe">Stripe Payment Link</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Internal Notes
                  <span className="text-gray-500 font-normal ml-1">(admin only, not on invoice)</span>
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  placeholder="Private notes about this order, customer preferences, etc..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Invoice Notes
                  <span className="text-gray-500 font-normal ml-1">(displayed on the PDF invoice)</span>
                </label>
                <textarea
                  value={formData.invoiceNotes}
                  onChange={(e) => setFormData({ ...formData, invoiceNotes: e.target.value })}
                  rows={2}
                  placeholder="Payment terms, special conditions, thank you message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Total Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Invoice Total</h4>
            <div className="space-y-1 text-sm text-gray-900">
              <div className="flex justify-between font-bold text-lg">
                <span>Total ({formData.ticketQuantity} tickets)</span>
                <span>{formatAmount(total)}</span>
              </div>
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

// Invoice Details Modal (simplified version - can be expanded)
function InvoiceDetailsModal({
  invoice,
  onClose,
  onUpdate,
}: {
  invoice: B2BInvoiceWithAttendees;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const [activeSection, setActiveSection] = useState<'details' | 'attendees' | 'actions'>(
    'details'
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddAttendee, setShowAddAttendee] = useState(false);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [attendeeForm, setAttendeeForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: invoice.company_name,
    jobTitle: '',
  });

  // Get current form values from invoice
  const getFormValuesFromInvoice = useCallback(() => ({
    contactName: invoice.contact_name,
    contactEmail: invoice.contact_email,
    companyName: invoice.company_name,
    vatId: invoice.vat_id || '',
    billingAddressStreet: invoice.billing_address_street,
    billingAddressCity: invoice.billing_address_city,
    billingAddressPostalCode: invoice.billing_address_postal_code,
    billingAddressCountry: invoice.billing_address_country,
    dueDate: invoice.due_date,
    notes: invoice.notes || '',
    invoiceNotes: invoice.invoice_notes || '',
    ticketQuantity: invoice.ticket_quantity,
    unitPrice: invoice.unit_price,
  }), [invoice]);

  const [editFormData, setEditFormData] = useState(getFormValuesFromInvoice);

  // Function to enter edit mode - resets form to current invoice values
  const startEditing = useCallback(() => {
    setEditFormData(getFormValuesFromInvoice());
    setIsEditing(true);
  }, [getFormValuesFromInvoice]);

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
          // Send empty string to clear notes (will be converted to null by API)
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

  const handleAddAttendee = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading('addAttendee');
    setError(null);

    try {
      const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}/attendees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendees: [{
            firstName: attendeeForm.firstName,
            lastName: attendeeForm.lastName,
            email: attendeeForm.email,
            company: attendeeForm.company || undefined,
            jobTitle: attendeeForm.jobTitle || undefined,
          }],
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add attendee');
      }

      // Reset form and hide it
      setAttendeeForm({ firstName: '', lastName: '', email: '', company: invoice.company_name, jobTitle: '' });
      setShowAddAttendee(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add attendee');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAttendee = async (attendeeId: string) => {
    if (!confirm('Are you sure you want to remove this attendee?')) return;

    setActionLoading('deleteAttendee');
    setError(null);

    try {
      const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}/attendees?attendeeId=${attendeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove attendee');
      }

      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove attendee');
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{invoice.invoice_number}</h3>
              <p className="text-sm text-gray-700">{invoice.company_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${statusColors[invoice.status]}`}
              >
                {invoice.status}
              </span>
              <button onClick={onClose} className="text-gray-600 hover:text-gray-900 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Section tabs */}
          <div className="flex gap-2 sm:gap-4 mt-4 overflow-x-auto pb-1">
            {(['details', 'attendees', 'actions'] as const).map((section) => (
              <button
                key={section}
                onClick={() => setActiveSection(section)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeSection === section
                    ? 'bg-[#F1E271] text-black'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {activeSection === 'details' && (
            <div className="space-y-6">
              {/* Edit/View Toggle */}
              {(invoice.status === 'draft' || invoice.status === 'sent') && !isEditing && (
                <div className="flex justify-end">
                  <button
                    onClick={startEditing}
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer text-gray-900"
                  >
                    Edit Details
                  </button>
                </div>
              )}

              {isEditing ? (
                /* Edit Form */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">Company Name</label>
                      <input
                        type="text"
                        value={editFormData.companyName}
                        onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Contact Name</label>
                      <input
                        type="text"
                        value={editFormData.contactName}
                        onChange={(e) => setEditFormData({ ...editFormData, contactName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={editFormData.contactEmail}
                        onChange={(e) => setEditFormData({ ...editFormData, contactEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">VAT ID</label>
                      <input
                        type="text"
                        value={editFormData.vatId}
                        onChange={(e) => setEditFormData({ ...editFormData, vatId: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Due Date</label>
                      <input
                        type="date"
                        value={editFormData.dueDate}
                        onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">Street</label>
                      <input
                        type="text"
                        value={editFormData.billingAddressStreet}
                        onChange={(e) => setEditFormData({ ...editFormData, billingAddressStreet: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">City</label>
                      <input
                        type="text"
                        value={editFormData.billingAddressCity}
                        onChange={(e) => setEditFormData({ ...editFormData, billingAddressCity: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Postal Code</label>
                      <input
                        type="text"
                        value={editFormData.billingAddressPostalCode}
                        onChange={(e) => setEditFormData({ ...editFormData, billingAddressPostalCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Country</label>
                      <input
                        type="text"
                        value={editFormData.billingAddressCountry}
                        onChange={(e) => setEditFormData({ ...editFormData, billingAddressCountry: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Ticket Quantity</label>
                      <input
                        type="number"
                        min={1}
                        value={editFormData.ticketQuantity}
                        onChange={(e) => setEditFormData({ ...editFormData, ticketQuantity: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Unit Price (CHF)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={editFormData.unitPrice / 100}
                        onChange={(e) => setEditFormData({ ...editFormData, unitPrice: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                      <p className="mt-1 text-xs text-gray-600">
                        Total: {formatAmount(editFormData.unitPrice * editFormData.ticketQuantity)}
                      </p>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Internal Notes
                        <span className="text-gray-500 font-normal ml-1">(admin only)</span>
                      </label>
                      <textarea
                        value={editFormData.notes}
                        onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                        rows={2}
                        placeholder="Private notes about this order..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                      />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">
                        Invoice Notes
                        <span className="text-gray-500 font-normal ml-1">(on PDF)</span>
                      </label>
                      <textarea
                        value={editFormData.invoiceNotes}
                        onChange={(e) => setEditFormData({ ...editFormData, invoiceNotes: e.target.value })}
                        rows={2}
                        placeholder="Payment terms, special conditions..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 text-gray-900 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={actionLoading === 'save'}
                      className="px-4 py-2 bg-[#F1E271] text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading === 'save' ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  {/* Invoice Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Bill To</h4>
                      <div className="text-sm text-gray-900 space-y-1">
                        <p className="font-medium">{invoice.company_name}</p>
                        <p>{invoice.contact_name}</p>
                        <p className="text-gray-700">{invoice.contact_email}</p>
                        <p>{invoice.billing_address_street}</p>
                        <p>
                          {invoice.billing_address_postal_code} {invoice.billing_address_city}
                        </p>
                        <p>{invoice.billing_address_country}</p>
                        {invoice.vat_id && <p>VAT: {invoice.vat_id}</p>}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Invoice Details</h4>
                      <div className="text-sm space-y-1 text-gray-900">
                        <div className="flex justify-between">
                          <span>Issue Date</span>
                          <span>{formatDate(invoice.issue_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Due Date</span>
                          <span>{formatDate(invoice.due_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tickets</span>
                          <span>
                            {invoice.ticket_quantity}x {invoice.ticket_category}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payment Method</span>
                          <span className="capitalize">
                            {invoice.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Stripe'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Link (Stripe only) */}
                  {invoice.payment_method === 'stripe' && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Stripe Payment Link</h4>
                      {invoice.stripe_payment_link_url ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm text-gray-700">Payment link ready</span>
                          <a
                            href={invoice.stripe_payment_link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-sm bg-[#635BFF] text-white rounded-lg font-medium hover:bg-[#5046e5] transition-colors cursor-pointer"
                          >
                            Open Payment Link
                          </a>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(invoice.stripe_payment_link_url || '');
                              alert('Payment link copied to clipboard!');
                            }}
                            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer text-gray-900"
                          >
                            Copy Link
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            setActionLoading('stripe');
                            setError(null);
                            try {
                              const response = await fetch(`/api/admin/b2b-invoices/${invoice.id}/stripe-link`, {
                                method: 'POST',
                              });
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
                          }}
                          disabled={actionLoading === 'stripe'}
                          className="px-3 py-1.5 text-sm bg-[#635BFF] text-white rounded-lg font-medium hover:bg-[#5046e5] transition-colors disabled:opacity-50 cursor-pointer"
                        >
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
                          <h4 className="font-medium text-gray-900 mb-2">
                            Internal Notes
                            <span className="text-gray-500 font-normal ml-1 text-sm">(admin only)</span>
                          </h4>
                          <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{invoice.notes}</p>
                        </div>
                      )}
                      {invoice.invoice_notes && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">
                            Invoice Notes
                            <span className="text-gray-500 font-normal ml-1 text-sm">(on PDF)</span>
                          </h4>
                          <p className="text-sm text-gray-900 bg-amber-50 p-3 rounded-lg border border-amber-200">{invoice.invoice_notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2 text-sm text-gray-900">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatAmount(invoice.subtotal, invoice.currency)}</span>
                      </div>
                      {invoice.vat_rate > 0 && (
                        <div className="flex justify-between">
                          <span>VAT ({invoice.vat_rate}%)</span>
                          <span>{formatAmount(invoice.vat_amount, invoice.currency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
                        <span>Total</span>
                        <span>{formatAmount(invoice.total_amount, invoice.currency)}</span>
                      </div>
                    </div>
                  </div>

                  {/* PDF Section */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Invoice PDF</h4>
                    {invoice.invoice_pdf_url ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm text-gray-700">
                          PDF attached ({invoice.invoice_pdf_source})
                        </span>
                        <a
                          href={invoice.invoice_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 text-sm bg-[#F1E271] text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors cursor-pointer"
                        >
                          Download PDF
                        </a>
                        <button
                          onClick={async () => {
                            if (!confirm('This will regenerate the PDF with current invoice details. Continue?')) return;
                            // First delete existing PDF
                            setActionLoading('pdf');
                            setError(null);
                            try {
                              const deleteRes = await fetch(`/api/admin/b2b-invoices/${invoice.id}/pdf`, {
                                method: 'DELETE',
                              });
                              if (!deleteRes.ok) throw new Error('Failed to delete existing PDF');
                              // Then generate new one
                              const genRes = await fetch(`/api/admin/b2b-invoices/${invoice.id}/pdf/generate`, {
                                method: 'POST',
                              });
                              if (!genRes.ok) throw new Error('Failed to generate new PDF');
                              onUpdate();
                            } catch (err) {
                              setError(err instanceof Error ? err.message : 'Failed to regenerate PDF');
                            } finally {
                              setActionLoading(null);
                            }
                          }}
                          disabled={actionLoading === 'pdf'}
                          className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50 cursor-pointer text-gray-900"
                        >
                          {actionLoading === 'pdf' ? 'Regenerating...' : 'Regenerate PDF'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleGeneratePDF}
                        disabled={actionLoading === 'pdf'}
                        className="px-3 py-1.5 text-sm bg-[#F1E271] text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {actionLoading === 'pdf' ? 'Generating...' : 'Generate PDF'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {activeSection === 'attendees' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900">
                  Attendees ({invoice.attendees.length}/{invoice.ticket_quantity})
                </h4>
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' &&
                 invoice.attendees.length < invoice.ticket_quantity && (
                  <button
                    onClick={() => setShowAddAttendee(true)}
                    className="px-3 py-1.5 text-sm bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#e6d766] transition-colors cursor-pointer"
                  >
                    + Add Attendee
                  </button>
                )}
              </div>

              {/* Add Attendee Form */}
              {showAddAttendee && (
                <form onSubmit={handleAddAttendee} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-3">Add New Attendee</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        value={attendeeForm.firstName}
                        onChange={(e) => setAttendeeForm({ ...attendeeForm, firstName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        value={attendeeForm.lastName}
                        onChange={(e) => setAttendeeForm({ ...attendeeForm, lastName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-900 mb-1">Email *</label>
                      <input
                        type="email"
                        required
                        value={attendeeForm.email}
                        onChange={(e) => setAttendeeForm({ ...attendeeForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Company</label>
                      <input
                        type="text"
                        value={attendeeForm.company}
                        onChange={(e) => setAttendeeForm({ ...attendeeForm, company: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-1">Job Title</label>
                      <input
                        type="text"
                        value={attendeeForm.jobTitle}
                        onChange={(e) => setAttendeeForm({ ...attendeeForm, jobTitle: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddAttendee(false);
                        setAttendeeForm({ firstName: '', lastName: '', email: '', company: invoice.company_name, jobTitle: '' });
                      }}
                      className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading === 'addAttendee'}
                      className="px-3 py-1.5 text-sm bg-[#F1E271] text-black font-medium rounded-lg hover:bg-[#e6d766] transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading === 'addAttendee' ? 'Adding...' : 'Add Attendee'}
                    </button>
                  </div>
                </form>
              )}

              {invoice.attendees.length === 0 ? (
                <p className="text-gray-700 text-center py-8">
                  No attendees added yet. Add attendees before marking as paid.
                </p>
              ) : (
                <div className="space-y-2">
                  {invoice.attendees.map((attendee) => (
                    <div
                      key={attendee.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {attendee.first_name} {attendee.last_name}
                        </p>
                        <p className="text-sm text-gray-700">{attendee.email}</p>
                        {(attendee.company || attendee.job_title) && (
                          <p className="text-xs text-gray-500">
                            {[attendee.job_title, attendee.company].filter(Boolean).join(' at ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {attendee.ticket_id ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
                            Ticket Created
                          </span>
                        ) : invoice.status !== 'paid' && invoice.status !== 'cancelled' ? (
                          <button
                            onClick={() => handleDeleteAttendee(attendee.id)}
                            disabled={actionLoading === 'deleteAttendee'}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Remove attendee"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {invoice.attendees.length < invoice.ticket_quantity && invoice.status !== 'paid' && (
                <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                  {invoice.ticket_quantity - invoice.attendees.length} more attendee(s) needed to complete this invoice.
                </p>
              )}
            </div>
          )}

          {activeSection === 'actions' && (
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
                      disabled={
                        !!actionLoading || invoice.attendees.length !== invoice.ticket_quantity
                      }
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

              {invoice.status === 'sent' &&
                invoice.attendees.length !== invoice.ticket_quantity && (
                  <p className="text-sm text-amber-900 bg-amber-100 px-3 py-2 rounded-lg">
                    Add all {invoice.ticket_quantity} attendees before marking as paid.
                  </p>
                )}
            </div>
          )}
        </div>
      </div>

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

// Mark as Paid Confirmation Modal
function MarkAsPaidModal({
  invoice,
  onClose,
  onSuccess,
}: {
  invoice: B2BInvoiceWithAttendees;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [bankReference, setBankReference] = useState('');
  const [sendEmails, setSendEmails] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    ticketsCreated: number;
    emailsSent: number;
    emailsFailed: number;
    tickets: Array<{ attendeeName: string; attendeeEmail: string; ticketId: string }>;
    emailFailures?: Array<{ attendeeEmail: string; attendeeName: string; reason: string }>;
  } | null>(null);

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
