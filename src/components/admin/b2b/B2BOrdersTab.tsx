/**
 * B2B Orders Tab - Admin interface for managing B2B invoices
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { B2BInvoice, B2BInvoiceWithAttendees, B2BInvoiceStatus } from '@/lib/types/b2b';
import { adminKeys } from '@/lib/admin/query-keys';
import { adminFetch } from '@/lib/admin/api-fetch';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { B2BSummaryStats } from './types';
import { B2BSummaryCards } from './B2BSummaryCards';
import { B2BFilters } from './B2BFilters';
import { B2BInvoiceList } from './B2BInvoiceList';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';

async function fetchInvoices(
  status: B2BInvoiceStatus | '',
  search: string,
  signal?: AbortSignal,
): Promise<B2BInvoice[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (search) params.append('search', search);

  const data = await adminFetch<{ invoices: B2BInvoice[] }>(
    `/api/admin/b2b-invoices?${params.toString()}`,
    { signal },
  );
  return data.invoices;
}

export function B2BOrdersTab() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<B2BInvoiceStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, 400);
  const [selectedInvoice, setSelectedInvoice] = useState<B2BInvoiceWithAttendees | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const {
    data: invoices = [],
    isPending: loading,
    error,
  } = useQuery({
    queryKey: adminKeys.b2bInvoiceList({ status: statusFilter, search: debouncedSearch }),
    queryFn: ({ signal }) => fetchInvoices(statusFilter, debouncedSearch, signal),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, debouncedSearch]);

  const summaryStats: B2BSummaryStats = useMemo(() => ({
    total: invoices.length,
    draft: invoices.filter((i) => i.status === 'draft').length,
    sent: invoices.filter((i) => i.status === 'sent').length,
    paid: invoices.filter((i) => i.status === 'paid').length,
    totalValue: invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + i.total_amount, 0),
  }), [invoices]);

  const handleInvoiceUpdate = () => {
    queryClient.invalidateQueries({ queryKey: adminKeys.b2b() });
    if (selectedInvoice) {
      adminFetch<B2BInvoiceWithAttendees>(`/api/admin/b2b-invoices/${selectedInvoice.id}`)
        .then(setSelectedInvoice)
        .catch(() => setSelectedInvoice(null));
    }
  };

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
          className="px-4 py-2 bg-brand-primary text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors cursor-pointer"
        >
          + Create Invoice
        </button>
      </div>

      <B2BSummaryCards stats={summaryStats} />

      <B2BFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error instanceof Error ? error.message : 'Failed to load invoices'}
        </div>
      )}

      {/* Loading / Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-700">Loading invoices...</p>
        </div>
      ) : (
        <B2BInvoiceList
          invoices={invoices}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onSelectInvoice={setSelectedInvoice}
          onCreateClick={() => setShowCreateModal(true)}
        />
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateInvoiceModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: adminKeys.b2b() });
          }}
        />
      )}

      {selectedInvoice && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onUpdate={handleInvoiceUpdate}
        />
      )}
    </div>
  );
}
