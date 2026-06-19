/**
 * SpendBreakdownSection - Shows total spend summary for a ticket holder
 * Displays: ticket cost + upgrade cost + workshop costs = total
 */

import type { SpendBreakdown } from '@/hooks/useTicketSpendBreakdown';

function formatCurrency(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

interface SpendBreakdownSectionProps {
  breakdown: SpendBreakdown;
  isLoading: boolean;
}

function LoadingSkeleton() {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="h-3 w-32 bg-gray-200 rounded animate-pulse mb-3" />
      <div className="space-y-2">
        <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-44 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function SpendBreakdownSection({ breakdown, isLoading }: SpendBreakdownSectionProps) {
  if (isLoading) return <LoadingSkeleton />;

  const hasUpgrade = breakdown.upgradeCost > 0;
  const hasWorkshops = breakdown.workshopCosts.length > 0;
  const hasMultipleItems = hasUpgrade || hasWorkshops;

  // If ticket cost is 0 and nothing else, don't show the section
  if (breakdown.ticketCost === 0 && !hasUpgrade && !hasWorkshops) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
      <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">
        Total Spend Breakdown
      </h4>
      <div className="space-y-2">
        {/* Ticket cost */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-700">Conference Ticket</span>
          <span className="font-medium text-black">
            {breakdown.ticketCost === 0
              ? 'Complimentary'
              : formatCurrency(breakdown.ticketCost, breakdown.ticketCurrency)}
          </span>
        </div>

        {/* Upgrade cost */}
        {hasUpgrade && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-700">VIP Upgrade</span>
            <span className="font-medium text-amber-700">
              +{formatCurrency(breakdown.upgradeCost, breakdown.upgradeCurrency || breakdown.ticketCurrency)}
            </span>
          </div>
        )}

        {/* Workshop costs */}
        {breakdown.workshopCosts.map((w) => (
          <div key={w.currency} className="flex justify-between items-center text-sm">
            <span className="text-gray-700">Workshops</span>
            <span className="font-medium text-purple-700">
              +{formatCurrency(w.amount, w.currency)}
            </span>
          </div>
        ))}

        {/* Divider + Total */}
        {hasMultipleItems && (
          <>
            <div className="border-t border-blue-200 my-1" />
            {breakdown.totalByCurrency.map((t) => (
              <div key={t.currency} className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-900">Total</span>
                <span className="text-base font-bold text-blue-800">
                  {formatCurrency(t.amount, t.currency)}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
