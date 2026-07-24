/**
 * Apparel Stats Cards
 * Summary of collected vs missing apparel sizes
 */

import React from 'react';
import { Shirt, AlertTriangle, Crown, Users } from 'lucide-react';
import type { ApparelStats, ApparelSpeakerStats } from './types';

interface ApparelStatsCardsProps {
  stats: ApparelStats;
  speakerStats: ApparelSpeakerStats;
}

export function ApparelStatsCards({ stats, speakerStats }: ApparelStatsCardsProps) {
  const items = [
    {
      key: 'tshirts',
      label: 'Attendee T-Shirts',
      value: `${stats.withTshirt}/${stats.totalTickets}`,
      icon: Shirt,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      key: 'missing-tshirts',
      label: 'Missing T-Shirt Size',
      value: `${stats.missingTshirt}`,
      icon: AlertTriangle,
      color: stats.missingTshirt > 0 ? 'text-orange-600 bg-orange-50' : 'text-green-600 bg-green-50',
    },
    {
      key: 'hoodies',
      label: 'VIP Hoodies',
      value: `${stats.vipWithHoodie}/${stats.vipTotal}`,
      icon: Crown,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      key: 'missing-hoodies',
      label: 'Missing Hoodie Size',
      value: `${stats.vipMissingHoodie}`,
      icon: AlertTriangle,
      color: stats.vipMissingHoodie > 0 ? 'text-orange-600 bg-orange-50' : 'text-green-600 bg-green-50',
    },
    {
      key: 'speakers',
      label: 'Speakers (Tee / Hoodie)',
      value: `${speakerStats.withTshirt}/${speakerStats.total} · ${speakerStats.withHoodie}/${speakerStats.total}`,
      icon: Users,
      color: 'text-purple-600 bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.key} className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${item.color}`}>
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              </div>
              <span className="text-xs text-gray-500">{item.label}</span>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}
