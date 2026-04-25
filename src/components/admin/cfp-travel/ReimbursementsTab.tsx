/**
 * Reimbursements Tab Component
 * Manage speaker reimbursement requests
 *
 * TODO: Extend this flow to support richer invoice/document storage beyond the
 * current speaker-submitted `receipt_url` once the reimbursement workflow lands.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Filter } from 'lucide-react';
import { Pagination } from '@/components/atoms';
import { cycleMultiSort, getMultiSortDirection, SortIndicator, type MultiSort } from '@/components/admin/cfp/tableSort';
import type { ReimbursementWithSpeaker } from '@/lib/cfp/admin-travel';
import type { CfpReimbursementStatus } from '@/lib/types/cfp';
import { formatDate } from './format';
import { STATUS_COLORS } from './types';

type ReimbursementSortKey = 'speaker' | 'expense' | 'amount' | 'submitted' | 'status';

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
      <div className="space-y-4">
          <div className="px-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Filter className="h-4 w-4 text-brand-gray-medium" />
            <span>
              Showing <span className="font-semibold text-black">{filteredReimbursements.length}</span> reimbursement
              {filteredReimbursements.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search speaker or expense..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary lg:w-80"
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
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
            <thead className="bg-gray-50 text-left text-sm text-gray-500">
              <tr>
                <SortableHeader label="Speaker" sortKey="speaker" sort={sort} onClick={handleSortClick} />
                <SortableHeader label="Expense" sortKey="expense" sort={sort} onClick={handleSortClick} />
                <SortableHeader label="Amount" sortKey="amount" sort={sort} onClick={handleSortClick} />
                <SortableHeader label="Submitted" sortKey="submitted" sort={sort} onClick={handleSortClick} />
                <SortableHeader label="Status" sortKey="status" sort={sort} onClick={handleSortClick} />
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Banking</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    Loading reimbursements...
                  </td>
                </tr>
              ) : paginatedReimbursements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
                    No reimbursements found
                  </td>
                </tr>
              ) : (
                paginatedReimbursements.map((reimbursement) => {
                  const isHighlighted = reimbursement.id === highlightedReimbursementId;

                  return (
                    <tr
                      key={reimbursement.id}
                      ref={(node) => {
                        rowRefs.current[reimbursement.id] = node;
                      }}
                      className={`align-top transition-colors hover:bg-gray-50 ${
                        isHighlighted ? 'bg-brand-primary/10' : ''
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-black">
                          {reimbursement.speaker.first_name} {reimbursement.speaker.last_name}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <div className="font-medium text-black">{reimbursement.expense_type}</div>
                        <div className="mt-1 max-w-md">{reimbursement.description || 'No description'}</div>
                        {reimbursement.admin_notes ? (
                          <div className="mt-2 text-xs text-brand-gray-medium">
                            Admin note: {reimbursement.admin_notes}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <div className="font-semibold text-black">
                          {reimbursement.currency} {(reimbursement.amount / 100).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">{formatDate(reimbursement.created_at)}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded px-2 py-1 text-xs capitalize ${STATUS_COLORS[reimbursement.status]}`}>
                          {reimbursement.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {reimbursement.receipt_url ? (
                          <a
                            href={reimbursement.receipt_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 font-medium text-black hover:bg-text-brand-gray-lightest"
                          >
                            <ExternalLink className="size-4" />
                            Open
                          </a>
                        ) : (
                          <span className="text-gray-400">No receipt</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {reimbursement.iban ? (
                          <div className="space-y-1">
                            <div className="font-medium text-black">{reimbursement.iban}</div>
                            {reimbursement.swift_bic ? <div className="text-xs text-brand-gray-medium">SWIFT: {reimbursement.swift_bic}</div> : null}
                            {reimbursement.bank_account_holder ? (
                              <div className="text-xs text-brand-gray-medium">{reimbursement.bank_account_holder}</div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-gray-400">No banking details</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          {reimbursement.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onApprove(reimbursement.id)}
                                disabled={isUpdating}
                                className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => onReject(reimbursement.id)}
                                disabled={isUpdating}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          ) : null}
                          {reimbursement.status === 'approved' ? (
                            <button
                              type="button"
                              onClick={() => onMarkPaid(reimbursement.id)}
                              disabled={isUpdating}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                            >
                              Mark as paid
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageSize={pageSize}
          totalItems={filteredReimbursements.length}
          variant="light"
        />
      </div>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  sort,
  onClick,
}: {
  label: string;
  sortKey: ReimbursementSortKey;
  sort: MultiSort<ReimbursementSortKey>;
  onClick: (key: ReimbursementSortKey) => void;
}) {
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-black"
      >
        <span>{label}</span>
        <SortIndicator direction={getMultiSortDirection(sort, sortKey)} />
      </button>
    </th>
  );
}
