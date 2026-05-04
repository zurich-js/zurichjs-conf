/**
 * VIP Perks Stats Cards
 * Summary statistics for VIP perk management
 */

import React from 'react';
import { Crown, Ticket, CheckCircle, Mail, Clock } from 'lucide-react';
import type { VipPerksStats } from './types';

interface StatsCardsProps {
  stats: VipPerksStats;
}

const STAT_ITEMS = [
  { key: 'total_vip_tickets', label: 'VIP Tickets', icon: Crown, color: 'text-amber-600 bg-amber-50' },
  { key: 'perks_created', label: 'Perks Created', icon: Ticket, color: 'text-blue-600 bg-blue-50' },
  { key: 'perks_redeemed', label: 'Redeemed', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  { key: 'emails_sent', label: 'Emails Sent', icon: Mail, color: 'text-purple-600 bg-purple-50' },
  { key: 'pending', label: 'Pending', icon: Clock, color: 'text-orange-600 bg-orange-50' },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {STAT_ITEMS.map((item) => {
        const Icon = item.icon;
        const value = stats[item.key];
        return (
          <div key={item.key} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${item.color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{value}</p>
          </div>
        );
      })}
    </div>
  );
}
