/**
 * B2B Filters - Search and status filter for B2B orders
 */

import type { B2BInvoiceStatus } from '@/lib/types/b2b';

interface B2BFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: B2BInvoiceStatus | '';
  onStatusChange: (value: B2BInvoiceStatus | '') => void;
}

export function B2BFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: B2BFiltersProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by company name or invoice number..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#F1E271] focus:border-[#F1E271] text-gray-900 placeholder:text-gray-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as B2BInvoiceStatus | '')}
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
  );
}
