/**
 * Analytics Tab Component
 * Displays partnership performance analytics
 */

import React from 'react';
import { TrendingUp, Ticket, Gift, DollarSign, Users } from 'lucide-react';
import type { PartnershipAnalyticsResponse } from '../types';

interface AnalyticsTabProps {
  analytics: PartnershipAnalyticsResponse | undefined;
  isLoading: boolean;
}

function formatCurrency(cents: number): string {
  return `CHF ${(cents / 100).toFixed(2)}`;
}

export function AnalyticsTab({ analytics, isLoading }: AnalyticsTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-black/50">
        <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No analytics data available yet.</p>
        <p className="text-sm mt-1">Analytics will appear once there are ticket purchases.</p>
      </div>
    );
  }

  const { summary, coupons, vouchers, tickets } = analytics;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-blue-600 font-medium">Tickets Sold</span>
          </div>
          <p className="text-2xl font-bold text-black">{summary.totalTicketsSold}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-600 font-medium">Net Revenue</span>
          </div>
          <p className="text-2xl font-bold text-black">{formatCurrency(summary.netRevenue)}</p>
        </div>
        <div className="bg-gradient-to-br from-[#F1E271]/20 to-[#F1E271]/5 rounded-lg p-4 border border-[#F1E271]/30">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="h-4 w-4 text-[#B8A830]" />
            <span className="text-xs text-[#B8A830] font-medium">Coupon Uses</span>
          </div>
          <p className="text-2xl font-bold text-black">{summary.totalCouponRedemptions}</p>
        </div>
        <div className="bg-gradient-to-br from-pink-50 to-pink-100/50 rounded-lg p-4 border border-pink-100">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-4 w-4 text-pink-600" />
            <span className="text-xs text-pink-600 font-medium">Discounts Given</span>
          </div>
          <p className="text-2xl font-bold text-black">{formatCurrency(summary.totalDiscountsGiven)}</p>
        </div>
      </div>

      {/* Coupon Breakdown */}
      {coupons.byCode.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-black mb-3">Coupon Performance</h4>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-black/60 uppercase">Code</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-black/60 uppercase">Discount</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-black/60 uppercase">Uses</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-black/60 uppercase">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {coupons.byCode.map((coupon) => (
                  <tr key={coupon.id}>
                    <td className="px-4 py-3 font-mono text-sm">{coupon.code}</td>
                    <td className="px-4 py-3">
                      {coupon.discountPercent
                        ? `${coupon.discountPercent}%`
                        : formatCurrency(coupon.discountAmount || 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {coupon.redemptions}
                      {coupon.maxRedemptions && <span className="text-black/40">/{coupon.maxRedemptions}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(coupon.discountGiven)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Voucher Breakdown */}
      {vouchers.total > 0 && (
        <div>
          <h4 className="text-sm font-medium text-black mb-3">Voucher Status</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-black">{vouchers.total}</p>
              <p className="text-xs text-black/60">Total Issued</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{vouchers.redeemed}</p>
              <p className="text-xs text-green-600">Redeemed</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-black">{vouchers.unredeemed}</p>
              <p className="text-xs text-black/60">Available</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Tickets */}
      {tickets.recent.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-black mb-3">Recent Purchases ({tickets.total} total)</h4>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="divide-y divide-gray-100">
              {tickets.recent.slice(0, 5).map((ticket) => (
                <div key={ticket.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-black">
                      {ticket.firstName} {ticket.lastName}
                    </p>
                    <p className="text-xs text-black/60">{ticket.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-black">
                      {formatCurrency(ticket.amountPaid)}
                    </p>
                    {ticket.discountAmount > 0 && (
                      <p className="text-xs text-green-600">
                        -{formatCurrency(ticket.discountAmount)} ({ticket.couponCode})
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
