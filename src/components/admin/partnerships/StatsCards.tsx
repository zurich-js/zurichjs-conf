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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
          >
            <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-12" />
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
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: 'Communities',
      value: stats.byType.community || 0,
      icon: Users,
      color: 'bg-purple-100 text-purple-600',
    },
    {
      label: 'Companies',
      value: stats.byType.company || 0,
      icon: Building2,
      color: 'bg-green-100 text-green-600',
    },
    {
      label: 'Individuals',
      value: stats.byType.individual || 0,
      icon: User,
      color: 'bg-orange-100 text-orange-600',
    },
    {
      label: 'Active Coupons',
      value: stats.activeCoupons,
      icon: Ticket,
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      label: 'Active Vouchers',
      value: stats.activeVouchers,
      icon: Gift,
      color: 'bg-pink-100 text-pink-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-lg border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
            <div className={`p-2 rounded-lg ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
