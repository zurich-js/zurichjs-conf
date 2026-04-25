/**
 * Reimbursements Tab Component
 * Manage speaker reimbursement requests
 *
 * TODO: Extend this flow to support richer invoice/document storage beyond the
 * current speaker-submitted `receipt_url` once the reimbursement workflow lands.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table';
import { ExternalLink } from 'lucide-react';
import { Pagination } from '@/components/atoms';
import { AdminDataTable, AdminMobileCard, AdminTableToolbar } from '@/components/admin/common';
import { cycleMultiSort, getMultiSortDirection, SortIndicator, type MultiSort } from '@/components/admin/cfp/tableSort';
import type { ReimbursementWithSpeaker } from '@/lib/cfp/admin-travel';
import type { CfpReimbursementStatus } from '@/lib/types/cfp';
import { formatDate } from './format';
import { STATUS_COLORS } from './types';

type ReimbursementSortKey = 'speaker' | 'expense' | 'amount' | 'submitted' | 'status';
const columnHelper = createColumnHelper<ReimbursementWithSpeaker>();

interface ReimbursementsTabProps {
  reimbursements: ReimbursementWithSpeaker[];
  filteredReimbursements: ReimbursementWithSpeaker[];
  isLoading: boolean;
  filter: CfpReimbursementStatus | 'all';
  setFilter: (status: CfpReimbursementStatus | 'all') => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onMarkPaid: (id: string) => void;
  isUpdating: boolean;
  highlightedReimbursementId?: string | null;
  onHighlightHandled?: () => void;
}

export function ReimbursementsTab({
  reimbursements,
  isLoading,
  filter,
  setFilter,
  currentPage,
  onPageChange,
  pageSize,
  onApprove,
  onReject,
  onMarkPaid,
  isUpdating,
  highlightedReimbursementId,
  onHighlightHandled,
}: ReimbursementsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState<MultiSort<ReimbursementSortKey>>([]);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const filteredReimbursements = useMemo(() => {
    let next = reimbursements.filter((reimbursement) => {
      const matchesStatus = filter === 'all' || reimbursement.status === filter;
      const haystack = [
        reimbursement.speaker.first_name,
        reimbursement.speaker.last_name,
        reimbursement.expense_type,
        reimbursement.description,
        reimbursement.currency,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = haystack.includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    if (sort.length > 0) {
      next = [...next].sort((a, b) => {
        for (const rule of sort) {
          const direction = rule.direction === 'asc' ? 1 : -1;
          let comparison = 0;

          if (rule.key === 'speaker') {
            comparison = `${a.speaker.last_name} ${a.speaker.first_name}`.localeCompare(
              `${b.speaker.last_name} ${b.speaker.first_name}`
            );
          } else if (rule.key === 'expense') {
            comparison = `${a.expense_type} ${a.description}`.localeCompare(`${b.expense_type} ${b.description}`);
          } else if (rule.key === 'amount') {
            comparison = a.amount - b.amount;
          } else if (rule.key === 'submitted') {
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          } else if (rule.key === 'status') {
            comparison = a.status.localeCompare(b.status);
          }

          if (comparison !== 0) return comparison * direction;
        }

        return 0;
      });
    } else {
      next = [...next].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return next;
  }, [reimbursements, filter, searchQuery, sort]);

  useEffect(() => {
    onPageChange(1);
  }, [filter, searchQuery, onPageChange]);

  const totalPages = Math.ceil(filteredReimbursements.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedReimbursements = filteredReimbursements.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (!highlightedReimbursementId) return;

    const highlightedIndex = filteredReimbursements.findIndex((item) => item.id === highlightedReimbursementId);
    if (highlightedIndex === -1) {
      onHighlightHandled?.();
      return;
    }

    const targetPage = Math.floor(highlightedIndex / pageSize) + 1;
    if (targetPage !== currentPage) {
      onPageChange(targetPage);
      return;
    }

    const row = rowRefs.current[highlightedReimbursementId];
    if (row) {
      row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      onHighlightHandled?.();
    }
  }, [
    currentPage,
    filteredReimbursements,
    highlightedReimbursementId,
    onHighlightHandled,
    onPageChange,
    pageSize,
  ]);

  const handleSortClick = (key: ReimbursementSortKey) => setSort(cycleMultiSort(sort, key));

  return (
      <AdminDataTable
        data={paginatedReimbursements}
        columns={getReimbursementColumns({
          sort,
          handleSortClick,
          highlightedReimbursementId,
          rowRefs,
          onApprove,
          onReject,
          onMarkPaid,
          isUpdating,
        })}
        isLoading={isLoading}
        emptyState="No reimbursements found"
        rowClassName={(reimbursement) => reimbursement.id === highlightedReimbursementId ? 'bg-brand-primary/10' : ''}
        toolbar={(
          <AdminTableToolbar
            right={(
              <>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search speaker or expense..."
                  className="min-w-[280px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-brand-gray-medium focus:outline-none focus:ring-2 focus:ring-brand-primary lg:flex-none"
                />
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value as CfpReimbursementStatus | 'all')}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-primary"
                >
                  {(['all', 'pending', 'approved', 'rejected', 'paid'] as const).map((status) => (
                    <option key={status} value={status}>
                      {status === 'all' ? 'All statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </>
            )}
          />
        )}
        mobileList={{
          renderCard: (reimbursement) => (
            <AdminMobileCard key={reimbursement.id} className={reimbursement.id === highlightedReimbursementId ? 'bg-brand-primary/10' : ''}>
              <div className="mb-3">
                <div className="font-medium text-black">{reimbursement.speaker.first_name} {reimbursement.speaker.last_name}</div>
                <div className="mt-1 text-sm text-brand-gray-dark">{reimbursement.expense_type}</div>
                <div className="mt-1 text-xs text-brand-gray-medium">{reimbursement.description || 'No description'}</div>
              </div>
              <div className="mb-3 flex items-center justify-between">
                <span className="font-semibold text-black">{reimbursement.currency} {(reimbursement.amount / 100).toFixed(2)}</span>
                <span className={`inline-flex rounded px-2 py-1 text-xs capitalize ${STATUS_COLORS[reimbursement.status]}`}>
                  {reimbursement.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-brand-gray-dark">
                <div>Submitted {formatDate(reimbursement.created_at)}</div>
                {reimbursement.receipt_url ? (
                  <a href={reimbursement.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 font-medium text-black hover:bg-text-brand-gray-lightest">
                    <ExternalLink className="size-4" />
                    Open receipt
                  </a>
                ) : null}
              </div>
            </AdminMobileCard>
          ),
        }}
        pagination={(
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            totalItems={filteredReimbursements.length}
            variant="light"
          />
        )}
      />
  );
}

function getReimbursementColumns({
  sort,
  handleSortClick,
  highlightedReimbursementId,
  rowRefs,
  onApprove,
  onReject,
  onMarkPaid,
  isUpdating,
}: {
  sort: MultiSort<ReimbursementSortKey>;
  handleSortClick: (key: ReimbursementSortKey) => void;
  highlightedReimbursementId?: string | null;
  rowRefs: React.MutableRefObject<Record<string, HTMLTableRowElement | null>>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onMarkPaid: (id: string) => void;
  isUpdating: boolean;
}): Array<ColumnDef<ReimbursementWithSpeaker, unknown>> {
  return [
    columnHelper.display({
      id: 'speaker',
      header: () => (
        <button type="button" onClick={() => handleSortClick('speaker')} className="inline-flex items-center gap-1 font-medium text-brand-gray-medium hover:text-black">
          <span>Speaker</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'speaker')} />
        </button>
      ),
      cell: ({ row }) => {
        if (row.original.id === highlightedReimbursementId) {
          rowRefs.current[row.original.id] = null;
        }
        return <div className="font-medium text-black">{row.original.speaker.first_name} {row.original.speaker.last_name}</div>;
      },
    }),
    columnHelper.display({
      id: 'expense',
      header: () => (
        <button type="button" onClick={() => handleSortClick('expense')} className="inline-flex items-center gap-1 font-medium text-brand-gray-medium hover:text-black">
          <span>Expense</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'expense')} />
        </button>
      ),
      cell: ({ row }) => (
        <div className="text-sm text-brand-gray-dark">
          <div className="font-medium text-black">{row.original.expense_type}</div>
          <div className="mt-1 max-w-md">{row.original.description || 'No description'}</div>
          {row.original.admin_notes ? <div className="mt-2 text-xs text-brand-gray-medium">Admin note: {row.original.admin_notes}</div> : null}
        </div>
      ),
    }),
    columnHelper.display({
      id: 'amount',
      header: () => (
        <button type="button" onClick={() => handleSortClick('amount')} className="inline-flex items-center gap-1 font-medium text-brand-gray-medium hover:text-black">
          <span>Amount</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'amount')} />
        </button>
      ),
      cell: ({ row }) => <div className="text-sm font-semibold text-black">{row.original.currency} {(row.original.amount / 100).toFixed(2)}</div>,
    }),
    columnHelper.display({
      id: 'submitted',
      header: () => (
        <button type="button" onClick={() => handleSortClick('submitted')} className="inline-flex items-center gap-1 font-medium text-brand-gray-medium hover:text-black">
          <span>Submitted</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'submitted')} />
        </button>
      ),
      cell: ({ row }) => <span className="text-sm text-brand-gray-dark">{formatDate(row.original.created_at)}</span>,
    }),
    columnHelper.display({
      id: 'status',
      header: () => (
        <button type="button" onClick={() => handleSortClick('status')} className="inline-flex items-center gap-1 font-medium text-brand-gray-medium hover:text-black">
          <span>Status</span>
          <SortIndicator direction={getMultiSortDirection(sort, 'status')} />
        </button>
      ),
      cell: ({ row }) => <span className={`inline-flex rounded px-2 py-1 text-xs capitalize ${STATUS_COLORS[row.original.status]}`}>{row.original.status}</span>,
    }),
    columnHelper.display({
      id: 'receipt',
      header: 'Receipt',
      cell: ({ row }) => row.original.receipt_url ? (
        <a href={row.original.receipt_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 font-medium text-black hover:bg-text-brand-gray-lightest">
          <ExternalLink className="size-4" />
          Open
        </a>
      ) : <span className="text-brand-gray-medium">No receipt</span>,
    }),
    columnHelper.display({
      id: 'banking',
      header: 'Banking',
      cell: ({ row }) => row.original.iban ? (
        <div className="space-y-1 text-sm text-brand-gray-dark">
          <div className="font-medium text-black">{row.original.iban}</div>
          {row.original.swift_bic ? <div className="text-xs text-brand-gray-medium">SWIFT: {row.original.swift_bic}</div> : null}
          {row.original.bank_account_holder ? <div className="text-xs text-brand-gray-medium">{row.original.bank_account_holder}</div> : null}
        </div>
      ) : <span className="text-brand-gray-medium">No banking details</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.status === 'pending' ? (
            <>
              <button type="button" onClick={() => onApprove(row.original.id)} disabled={isUpdating} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50">
                Approve
              </button>
              <button type="button" onClick={() => onReject(row.original.id)} disabled={isUpdating} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50">
                Reject
              </button>
            </>
          ) : null}
          {row.original.status === 'approved' ? (
            <button type="button" onClick={() => onMarkPaid(row.original.id)} disabled={isUpdating} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
              Mark as paid
            </button>
          ) : null}
        </div>
      ),
    }),
  ];
}
