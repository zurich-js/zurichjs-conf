/**
 * Partnership Stats Cards Component
 * Displays overview statistics for partnerships
 */

import React from 'react';
import { Users, Building2, User, Ticket, Gift } from 'lucide-react';
import type { PartnershipStats } from './types';

interface StatsCardsProps {
  stats: PartnershipStats;
  isLoading?: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
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

  const cards = [
    {
      label: 'Total Partners',
      value: stats.total,
      icon: Users,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
    },
    {
      label: 'Communities',
      value: stats.byType.community || 0,
      icon: Users,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
    },
    {
      label: 'Companies',
      value: stats.byType.company || 0,
      icon: Building2,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      borderColor: 'border-green-100',
    },
    {
      label: 'Individuals',
      value: stats.byType.individual || 0,
      icon: User,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      borderColor: 'border-orange-100',
    },
    {
      label: 'Active Coupons',
      value: stats.activeCoupons,
      icon: Ticket,
      iconBg: 'bg-[#F1E271]/20',
      iconColor: 'text-[#B8A830]',
      borderColor: 'border-[#F1E271]/30',
    },
    {
      label: 'Active Vouchers',
      value: stats.activeVouchers,
      icon: Gift,
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
        </div>
      ))}
    </div>
  );
}
