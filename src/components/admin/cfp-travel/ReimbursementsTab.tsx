/**
 * Reimbursements Tab Component
 * Manage speaker reimbursement requests
 */

import { Pagination } from '@/components/atoms';
import type { ReimbursementWithSpeaker } from '@/lib/cfp/admin-travel';
import type { CfpReimbursementStatus } from '@/lib/types/cfp';
import { STATUS_COLORS } from './types';

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
}

export function ReimbursementsTab({
  filteredReimbursements,
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
}: ReimbursementsTabProps) {
  const totalPages = Math.ceil(filteredReimbursements.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedReimbursements = filteredReimbursements.slice(startIndex, startIndex + pageSize);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-black">Reimbursements</h2>
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'rejected', 'paid'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors capitalize ${
                filter === status ? 'bg-[#F1E271] text-black' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      ) : paginatedReimbursements.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No reimbursements found</p>
        </div>
      ) : (
        paginatedReimbursements.map((reimbursement) => (
          <ReimbursementCard
            key={reimbursement.id}
            reimbursement={reimbursement}
            onApprove={onApprove}
            onReject={onReject}
            onMarkPaid={onMarkPaid}
            isUpdating={isUpdating}
          />
        ))
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        pageSize={pageSize}
        totalItems={filteredReimbursements.length}
        variant="light"
      />
    </div>
  );
}

function ReimbursementCard({
  reimbursement,
  onApprove,
  onReject,
  onMarkPaid,
  isUpdating,
}: {
  reimbursement: ReimbursementWithSpeaker;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onMarkPaid: (id: string) => void;
  isUpdating: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="font-medium text-gray-900">
              {reimbursement.speaker.first_name} {reimbursement.speaker.last_name}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded capitalize ${STATUS_COLORS[reimbursement.status]}`}>
              {reimbursement.status}
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-1">
            {reimbursement.expense_type} - {reimbursement.description}
          </div>
          <div className="text-xs text-gray-400">Submitted {new Date(reimbursement.created_at).toLocaleDateString()}</div>
          {reimbursement.iban && (
            <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
              <div>IBAN: {reimbursement.iban}</div>
              {reimbursement.swift_bic && <div>SWIFT: {reimbursement.swift_bic}</div>}
              {reimbursement.bank_account_holder && <div>Account: {reimbursement.bank_account_holder}</div>}
            </div>
          )}
          {reimbursement.admin_notes && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                <span className="text-gray-400">Note:</span> {reimbursement.admin_notes}
              </p>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            {reimbursement.currency} {(reimbursement.amount / 100).toFixed(2)}
          </div>
          {reimbursement.status === 'pending' && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onApprove(reimbursement.id)}
                disabled={isUpdating}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Approve
              </button>
              <button
                onClick={() => onReject(reimbursement.id)}
                disabled={isUpdating}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          )}
          {reimbursement.status === 'approved' && (
            <button
              onClick={() => onMarkPaid(reimbursement.id)}
              disabled={isUpdating}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Mark as Paid
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
