/**
 * Sponsorship Stats Cards Component
 * Displays overview statistics for sponsorships
 */

import React from 'react';
import { Building2, Handshake, CheckCircle, Clock, DollarSign, Image } from 'lucide-react';
import type { SponsorshipStats } from './types';

interface StatsCardsProps {
  stats: SponsorshipStats | null;
  isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-10 w-10 bg-gray-200 rounded-lg mb-3" />
            <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-7 bg-gray-200 rounded w-10" />
          </div>
        ))}
      </div>
    );
  }

  // Format currency for display with comma delimiters
  const formatRevenue = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  const cards = [
    {
      label: 'Total Sponsors',
      value: stats.totalSponsors,
      icon: Building2,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Total Deals',
      value: stats.totalDeals,
      icon: Handshake,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
    },
    {
      label: 'Paid Deals',
      value: stats.dealsByStatus.paid || 0,
      icon: CheckCircle,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100',
    },
    {
      label: 'Pending',
      value: (stats.dealsByStatus.invoiced || 0) + (stats.dealsByStatus.invoice_sent || 0),
      icon: Clock,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-100',
    },
    {
      label: 'Revenue CHF',
      value: `${formatRevenue(stats.revenueByCurrency.CHF.paid)}`,
      subValue: stats.revenueByCurrency.CHF.pending > 0
        ? `+${formatRevenue(stats.revenueByCurrency.CHF.pending)} pending`
        : undefined,
      icon: DollarSign,
      iconBg: 'bg-[#F1E271]/20',
      iconColor: 'text-[#B8A830]',
      borderColor: 'border-[#F1E271]/30',
    },
    {
      label: 'Public Logos',
      value: stats.publicLogos,
      icon: Image,
      iconBg: 'bg-pink-50',
      iconColor: 'text-pink-600',
      borderColor: 'border-pink-100',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white rounded-xl border ${card.borderColor} p-4 hover:shadow-sm transition-shadow`}
        >
          <div className={`inline-flex p-2.5 rounded-lg ${card.iconBg} mb-3`}>
            <card.icon className={`h-5 w-5 ${card.iconColor}`} />
          </div>
          <p className="text-xs text-black/60 font-medium uppercase tracking-wide mb-1">
            {card.label}
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-black">{card.value}</p>
          {'subValue' in card && card.subValue && (
            <p className="text-xs text-gray-500 mt-1">{card.subValue}</p>
          )}
        </div>
      ))}
    </div>
  );
}
