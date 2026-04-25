/**
 * B2B Invoice List - Mobile cards and desktop table for invoices
 */

import { useMemo, useState } from 'react';
import type { B2BInvoice, B2BInvoiceWithAttendees } from '@/lib/types/b2b';
import { createColumnHelper, type ColumnDef, type SortingState, type Updater } from '@tanstack/react-table';
import { Pagination } from '@/components/atoms';
import { AdminDataTable, AdminMobileCard } from '@/components/admin/common';
import { statusColors, formatAmount, formatDate, ITEMS_PER_PAGE } from './types';

interface B2BInvoiceListProps {
  invoices: B2BInvoice[];
  currentPage: number;
  onPageChange: (page: number) => void;
  onSelectInvoice: (invoice: B2BInvoiceWithAttendees) => void;
  onCreateClick: () => void;
}

const columnHelper = createColumnHelper<B2BInvoice>();

export function B2BInvoiceList({
  invoices,
  currentPage,
  onPageChange,
  onSelectInvoice,
  onCreateClick,
}: B2BInvoiceListProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'invoice_number', desc: true }]);
  const sortedInvoices = useMemo(() => {
    const [rule] = sorting;
    const next = [...invoices];

    if (!rule) return next;
    const direction = rule.desc ? -1 : 1;
    next.sort((a, b) => {
      if (rule.id === 'company_name') return a.company_name.localeCompare(b.company_name) * direction;
      if (rule.id === 'status') return a.status.localeCompare(b.status) * direction;
      if (rule.id === 'total_amount') return (a.total_amount - b.total_amount) * direction;
      if (rule.id === 'due_date') return (new Date(a.due_date).getTime() - new Date(b.due_date).getTime()) * direction;
      return a.invoice_number.localeCompare(b.invoice_number) * direction;
    });
    return next;
  }, [invoices, sorting]);

  const totalPages = Math.ceil(sortedInvoices.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInvoices = sortedInvoices.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleViewDetails = async (invoiceId: string) => {
    const response = await fetch(`/api/admin/b2b-invoices/${invoiceId}`);
    if (response.ok) {
      const data = await response.json();
      onSelectInvoice(data);
    }
  };

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-brand-gray-lightest">
        <svg
          className="mx-auto h-12 w-12 text-brand-gray-medium"
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
          className="mt-4 px-4 py-2 bg-brand-primary text-black rounded-lg font-medium hover:bg-[#e6d766] transition-colors cursor-pointer"
        >
          Create First Invoice
        </button>
      </div>
    );
  }

  const handleSortingChange = (updater: Updater<SortingState>) => {
    setSorting((previous) => {
      const next = typeof updater === 'function' ? updater(previous) : updater;
      return next.slice(0, 1);
    });
  };

  const columns = [
    columnHelper.accessor('invoice_number', {
      header: 'Invoice #',
      enableSorting: true,
      size: 150,
      cell: ({ getValue }) => <span className="font-medium text-black">{getValue()}</span>,
    }),
    columnHelper.accessor('company_name', {
      header: 'Company',
      enableSorting: true,
      size: 260,
      cell: ({ row }) => (
        <div>
          <div className="text-sm text-black">{row.original.company_name}</div>
          <div className="text-xs text-brand-gray-dark">{row.original.contact_email}</div>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'tickets',
      header: 'Tickets',
      enableSorting: false,
      size: 180,
      cell: ({ row }) => <span className="text-sm text-black">{row.original.ticket_quantity}x {row.original.ticket_category}</span>,
    }),
    columnHelper.accessor('total_amount', {
      header: 'Total',
      enableSorting: true,
      size: 140,
      cell: ({ row, getValue }) => <span className="font-medium text-black">{formatAmount(getValue(), row.original.currency)}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      enableSorting: true,
      size: 120,
      cell: ({ getValue }) => (
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[getValue()]}`}>
          {getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('due_date', {
      header: 'Due Date',
      enableSorting: true,
      size: 140,
      cell: ({ getValue }) => <span className="text-sm text-black">{formatDate(getValue())}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      size: 120,
      cell: ({ row }) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            handleViewDetails(row.original.id);
          }}
          className="inline-flex items-center rounded-lg border border-brand-primary bg-brand-primary px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-[#e8d95e]"
          title="View invoice details"
        >
          View
        </button>
      ),
    }),
  ] as Array<ColumnDef<B2BInvoice, unknown>>;

  return (
    <AdminDataTable
      data={paginatedInvoices}
      columns={columns}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      onRowClick={(invoice) => handleViewDetails(invoice.id)}
      mobileList={{
        renderCard: (invoice) => (
          <AdminMobileCard key={invoice.id}>
            <div className="mb-3 flex items-start justify-between">
              <div>
                <p className="font-medium text-black">{invoice.invoice_number}</p>
                <p className="text-sm text-gray-700">{invoice.company_name}</p>
              </div>
              <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusColors[invoice.status]}`}>
                {invoice.status}
              </span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2 text-sm text-black">
              <div>
                <span className="font-medium">Tickets:</span>
                <span className="ml-1">{invoice.ticket_quantity}x {invoice.ticket_category}</span>
              </div>
              <div>
                <span className="font-medium">Due:</span>
                <span className="ml-1">{formatDate(invoice.due_date)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-text-brand-gray-lightest pt-3">
              <span className="font-bold text-black">{formatAmount(invoice.total_amount, invoice.currency)}</span>
              <button
                onClick={() => handleViewDetails(invoice.id)}
                className="rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-medium text-black"
              >
                View Details
              </button>
            </div>
          </AdminMobileCard>
        ),
      }}
      pagination={(
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageSize={ITEMS_PER_PAGE}
          totalItems={sortedInvoices.length}
          variant="light"
        />
      )}
    />
  );
}
