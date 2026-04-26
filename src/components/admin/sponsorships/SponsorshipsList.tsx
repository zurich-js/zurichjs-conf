/**
 * Sponsorships List Component
 * Displays sponsorship deals in a table/card view
 */

import React, { useMemo, useState } from 'react';
import { createColumnHelper, type ColumnDef, type SortingState, type Updater } from '@tanstack/react-table';
import { Eye, Building2 } from 'lucide-react';
import Image from 'next/image';
import { Pagination } from '@/components/atoms';
import { AdminDataTable, AdminMobileCard } from '@/components/admin/common';
import { StatusBadge } from './StatusBadge';
import type { SponsorshipDealListItem } from './types';

interface SponsorshipsListProps {
  deals: SponsorshipDealListItem[];
  isLoading?: boolean;
  onSelectDeal: (dealId: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  pageSize: number;
}

const columnHelper = createColumnHelper<SponsorshipDealListItem>();

export function SponsorshipsList({
  deals,
  isLoading,
  onSelectDeal,
  currentPage,
  onPageChange,
  pageSize,
}: SponsorshipsListProps) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'sponsor', desc: false }]);

  // Format currency for display with comma delimiters
  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const sortedDeals = useMemo(() => {
    const [rule] = sorting;
    const next = [...deals];

    if (!rule) return next;
    const direction = rule.desc ? -1 : 1;
    next.sort((a, b) => {
      if (rule.id === 'deal_number') return a.deal_number.localeCompare(b.deal_number) * direction;
      if (rule.id === 'tier') return (a.tier?.name || a.tier_id).localeCompare(b.tier?.name || b.tier_id) * direction;
      if (rule.id === 'amount') return ((a.invoice?.total_amount || 0) - (b.invoice?.total_amount || 0)) * direction;
      if (rule.id === 'status') return a.status.localeCompare(b.status) * direction;
      return (a.sponsor?.company_name || 'Unknown').localeCompare(b.sponsor?.company_name || 'Unknown') * direction;
    });
    return next;
  }, [deals, sorting]);

  const totalPages = Math.ceil(sortedDeals.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDeals = sortedDeals.slice(startIndex, startIndex + pageSize);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-brand-gray-lightest overflow-hidden">
        <div className="animate-pulse p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-12 w-12 b[a-z]-brand-gray-lightest rounded-lg" />
              <div className="flex-1">
                <div className="h-4 b[a-z]-brand-gray-lightest rounded w-1/3 mb-2" />
                <div className="h-3 b[a-z]-brand-gray-lightest rounded w-1/4" />
              </div>
              <div className="h-6 w-20 b[a-z]-brand-gray-lightest rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-brand-gray-lightest p-8 text-center">
        <Building2 className="h-12 w-12 text-brand-gray-medium mx-auto mb-4" />
        <h3 className="text-lg font-medium text-black mb-2">No sponsorships found</h3>
        <p className="text-brand-gray-medium">Create your first sponsorship deal to get started.</p>
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
    columnHelper.display({
      id: 'sponsor',
      header: 'Sponsor',
      enableSorting: true,
      size: 260,
      cell: ({ row }) => (
        <div className="flex items-center">
          <div className="relative h-10 w-10 shrink-0">
            {row.original.sponsor?.logo_url ? (
              <Image
                src={row.original.sponsor.logo_url}
                alt={row.original.sponsor.company_name}
                fill
                className="rounded-lg object-contain bg-text-brand-gray-lightest"
                unoptimized={row.original.sponsor.logo_url.endsWith('.svg') || row.original.sponsor.logo_url.endsWith('.gif')}
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-text-brand-gray-lightest">
                <Building2 className="h-5 w-5 text-brand-gray-medium" />
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-black">{row.original.sponsor?.company_name || 'Unknown'}</div>
            <div className="text-sm text-brand-gray-medium">{row.original.sponsor?.contact_email || ''}</div>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('deal_number', {
      header: 'Deal #',
      enableSorting: true,
      size: 120,
      cell: ({ getValue }) => <span className="font-mono text-sm text-black">{getValue()}</span>,
    }),
    columnHelper.display({
      id: 'tier',
      header: 'Tier',
      enableSorting: true,
      size: 140,
      cell: ({ row }) => <span className="text-sm capitalize text-black">{row.original.tier?.name || row.original.tier_id}</span>,
    }),
    columnHelper.display({
      id: 'amount',
      header: 'Amount',
      enableSorting: true,
      size: 140,
      cell: ({ row }) => (
        <span className="text-sm font-medium text-black">
          {row.original.invoice ? formatAmount(row.original.invoice.total_amount, row.original.currency) : row.original.currency}
        </span>
      ),
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      enableSorting: true,
      size: 120,
      cell: ({ row }) => <StatusBadge status={row.original.status} size="sm" />,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      size: 110,
      cell: ({ row }) => (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onSelectDeal(row.original.id);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-brand-primary px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-[#e6d766]"
        >
          <Eye className="h-4 w-4" />
          View
        </button>
      ),
    }),
  ] as Array<ColumnDef<SponsorshipDealListItem, unknown>>;

  return (
    <AdminDataTable
      data={paginatedDeals}
      columns={columns}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      onRowClick={(deal) => onSelectDeal(deal.id)}
      isLoading={isLoading}
      mobileList={{
        renderCard: (deal) => (
          <AdminMobileCard key={deal.id} className="cursor-pointer" >
            <div onClick={() => onSelectDeal(deal.id)}>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="relative h-10 w-10 shrink-0">
                    {deal.sponsor?.logo_url ? (
                      <Image
                        src={deal.sponsor.logo_url}
                        alt={deal.sponsor.company_name}
                        fill
                        className="rounded-lg object-contain bg-text-brand-gray-lightest"
                        unoptimized={deal.sponsor.logo_url.endsWith('.svg') || deal.sponsor.logo_url.endsWith('.gif')}
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-text-brand-gray-lightest">
                        <Building2 className="h-5 w-5 text-brand-gray-medium" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-black">{deal.sponsor?.company_name || 'Unknown'}</p>
                    <p className="font-mono text-xs text-brand-gray-medium">{deal.deal_number}</p>
                  </div>
                </div>
                <StatusBadge status={deal.status} size="sm" />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="capitalize text-brand-gray-medium">{deal.tier?.name || deal.tier_id}</span>
                <span className="font-medium text-black">
                  {deal.invoice ? formatAmount(deal.invoice.total_amount, deal.currency) : deal.currency}
                </span>
              </div>
            </div>
          </AdminMobileCard>
        ),
      }}
      pagination={(
        totalPages > 1 ? (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            totalItems={sortedDeals.length}
            variant="light"
          />
        ) : null
      )}
    />
  );
}
