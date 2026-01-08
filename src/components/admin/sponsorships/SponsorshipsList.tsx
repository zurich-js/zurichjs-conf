/**
 * Sponsorships List Component
 * Displays sponsorship deals in a table/card view
 */

import React from 'react';
import { Eye, Building2 } from 'lucide-react';
import Image from 'next/image';
import { StatusBadge } from './StatusBadge';
import type { SponsorshipDealListItem } from './types';

interface SponsorshipsListProps {
  deals: SponsorshipDealListItem[];
  isLoading?: boolean;
  onSelectDeal: (dealId: string) => void;
}

export function SponsorshipsList({ deals, isLoading, onSelectDeal }: SponsorshipsListProps) {
  // Format currency for display with comma delimiters
  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="animate-pulse p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-12 w-12 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
              <div className="h-6 w-20 bg-gray-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No sponsorships found</h3>
        <p className="text-gray-500">Create your first sponsorship deal to get started.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sponsor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Deal #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tier
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {deals.map((deal) => (
              <tr
                key={deal.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => onSelectDeal(deal.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 relative">
                      {deal.sponsor?.logo_url ? (
                        <Image
                          src={deal.sponsor.logo_url}
                          alt={deal.sponsor.company_name}
                          fill
                          className="rounded-lg object-contain bg-gray-100"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {deal.sponsor?.company_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {deal.sponsor?.contact_email || ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-mono text-gray-900">{deal.deal_number}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 capitalize">{deal.tier?.name || deal.tier_id}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-gray-900">
                    {deal.invoice
                      ? formatAmount(deal.invoice.total_amount, deal.currency)
                      : `${deal.currency}`}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={deal.status} size="sm" />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDeal(deal.id);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-black bg-[#F1E271] hover:bg-[#e6d766] rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200">
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="p-4 hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelectDeal(deal.id)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 h-10 w-10 relative">
                  {deal.sponsor?.logo_url ? (
                    <Image
                      src={deal.sponsor.logo_url}
                      alt={deal.sponsor.company_name}
                      fill
                      className="rounded-lg object-contain bg-gray-100"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {deal.sponsor?.company_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">{deal.deal_number}</p>
                </div>
              </div>
              <StatusBadge status={deal.status} size="sm" />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-500 capitalize">{deal.tier?.name || deal.tier_id}</span>
              <span className="font-medium text-gray-900">
                {deal.invoice
                  ? formatAmount(deal.invoice.total_amount, deal.currency)
                  : deal.currency}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
