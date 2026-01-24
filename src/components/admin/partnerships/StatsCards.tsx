/**
 * Partnership Stats Cards Component
 * Clean, scannable dashboard statistics display
 */

import React from 'react';
import { Users, Building2, User, Ticket, Gift, Trophy } from 'lucide-react';
import type { PartnershipStats } from './types';

interface StatsCardsProps {
  stats: PartnershipStats;
  isLoading?: boolean;
}

function formatCurrency(cents: number): string {
  const amount = cents / 100;
  if (amount >= 1000) {
    return `CHF ${(amount / 1000).toFixed(1)}k`;
  }
  return `CHF ${amount.toLocaleString('de-CH')}`;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className={`bg-white rounded-lg border border-gray-200 p-3 animate-pulse ${i < 2 ? 'col-span-2' : ''}`}
          >
            <div className="h-3 bg-gray-100 rounded w-16 mb-2" />
            <div className="h-6 bg-gray-100 rounded w-12" />
          </div>
        ))}
      </div>
    );
  }

  const hasTopPartners = stats.topPartnerships && stats.topPartnerships.length > 0;

  return (
    <div className="space-y-3">
      {/* Primary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Tickets Sold - Primary */}
        <StatCard
          label="Tickets Sold"
          value={stats.totalTicketsSold || 0}
          variant="primary"
          className="col-span-1 sm:col-span-2"
        />

        {/* Revenue - Primary with green */}
        <StatCard
          label="Revenue"
          value={formatCurrency(stats.totalRevenue || 0)}
          variant="success"
          className="col-span-1 sm:col-span-2"
        />

        {/* Coupons Used */}
        <StatCard
          label="Coupons Used"
          value={stats.totalCouponRedemptions || 0}
          icon={Ticket}
        />

        {/* Vouchers */}
        <StatCard
          label="Vouchers"
          value={stats.totalVoucherRedemptions || 0}
          icon={Gift}
        />

        {/* Discounts Given */}
        <StatCard
          label="Discounts"
          value={stats.totalDiscountGiven > 0 ? formatCurrency(stats.totalDiscountGiven) : '–'}
          variant={stats.totalDiscountGiven > 0 ? 'warning' : 'default'}
        />

        {/* Total Partners */}
        <StatCard
          label="Partners"
          value={stats.total}
          icon={Users}
        />
      </div>

      {/* Secondary Row: Partner Breakdown + Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Partner Type Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">By Type</h3>
          <div className="grid grid-cols-4 gap-3">
            <MiniStat
              icon={Users}
              label="Community"
              value={stats.byType.community || 0}
              color="purple"
            />
            <MiniStat
              icon={Building2}
              label="Company"
              value={stats.byType.company || 0}
              color="blue"
            />
            <MiniStat
              icon={User}
              label="Individual"
              value={stats.byType.individual || 0}
              color="orange"
            />
            <MiniStat
              icon={Users}
              label="Sponsor"
              value={stats.byType.sponsor || 0}
              color="green"
            />
          </div>
        </div>

        {/* Active Codes */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Active Codes</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-50">
                <Ticket className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <div className="text-xl font-semibold text-gray-900">{stats.activeCoupons}</div>
                <div className="text-xs text-gray-500">Coupons</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-50">
                <Gift className="h-4 w-4 text-pink-600" />
              </div>
              <div>
                <div className="text-xl font-semibold text-gray-900">{stats.activeVouchers}</div>
                <div className="text-xs text-gray-500">Vouchers</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Top Performers</h3>
          </div>
          {hasTopPartners ? (
            <div className="space-y-2">
              {stats.topPartnerships.slice(0, 3).map((partner, index) => (
                <div
                  key={partner.partnershipId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`font-medium ${index === 0 ? 'text-amber-500' : 'text-gray-400'}`}>
                      {index + 1}.
                    </span>
                    <span className="text-gray-900 truncate">{partner.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0 ml-2">
                    <span className="text-gray-500">{partner.ticketsSold}</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(partner.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">No sales yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Primary stat card */
function StatCard({
  label,
  value,
  icon: Icon,
  variant = 'default',
  className = '',
}: {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  className?: string;
}) {
  const variants = {
    default: 'bg-white text-gray-900',
    primary: 'bg-white text-gray-900',
    success: 'bg-white text-emerald-600',
    warning: 'bg-white text-amber-600',
  };

  return (
    <div className={`rounded-lg border border-gray-200 p-3 ${variants[variant]} ${className}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className={`text-2xl font-semibold ${variant === 'success' ? 'text-emerald-600' : variant === 'warning' ? 'text-amber-600' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  );
}

/** Mini stat for the breakdown grid */
function MiniStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'purple' | 'blue' | 'orange' | 'green';
}) {
  const colors = {
    purple: 'bg-purple-50 text-purple-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="text-center">
      <div className={`inline-flex p-1.5 rounded-md ${colors[color]} mb-1`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="text-lg font-semibold text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-500 truncate">{label}</div>
    </div>
  );
}
