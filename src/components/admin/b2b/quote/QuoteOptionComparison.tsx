/**
 * Quote Option Comparison
 * Side-by-side comparison cards when 2-3 options exist
 */

import { Sparkles, Crown, Users, TrendingDown } from 'lucide-react';
import type { QuoteBreakdown, QuoteCurrency } from '@/lib/types/b2b-quote';
import { formatQuoteAmount } from '@/lib/b2b/quote-calculations';

interface QuoteOptionComparisonProps {
  breakdown: QuoteBreakdown;
}

export function QuoteOptionComparison({ breakdown }: QuoteOptionComparisonProps) {
  const { options, bestValueIndex, currency } = breakdown;
  if (options.length < 2) return null;

  return (
    <section className="border border-gray-200 rounded-2xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Comparison</h2>
      <div className={`grid gap-5 ${options.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {options.map((opt, idx) => {
          const isBest = idx === bestValueIndex;
          return (
            <div
              key={opt.optionId}
              className={`rounded-xl p-5 ${isBest ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50 border border-gray-200'}`}
            >
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {opt.title || `Option ${idx + 1}`}
                </h3>
                {isBest && (
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-medium">
                    <Sparkles className="w-3 h-3" /> Most savings
                  </span>
                )}
              </div>

              {/* Total — prominent */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <span className="block text-xs text-gray-500 mb-0.5">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatQuoteAmount(opt.totalCents, currency)}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {opt.totalPeople > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <div className="flex items-baseline justify-between flex-1 gap-2">
                      <span className="text-xs text-gray-500">Per person</span>
                      <span className="text-sm font-medium text-gray-800">
                        {formatQuoteAmount(opt.perPersonCents, currency)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <div className="flex items-baseline justify-between flex-1 gap-2">
                    <span className="text-xs text-gray-500">Attendees</span>
                    <span className="text-sm font-medium text-gray-800">{opt.totalPeople}</span>
                  </div>
                </div>

                {opt.totalDiscountCents > 0 && (
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <div className="flex items-baseline justify-between flex-1 gap-2">
                      <span className="text-xs text-gray-500">Savings</span>
                      <span className="text-sm font-medium text-green-600">
                        -{formatQuoteAmount(opt.totalDiscountCents, currency)}
                      </span>
                    </div>
                  </div>
                )}

                {opt.vipTickets.quantity > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs text-gray-600">{opt.vipTickets.quantity} VIP ticket{opt.vipTickets.quantity !== 1 ? 's' : ''}</span>
                  </div>
                )}

                {opt.totalVipWorkshopSavingsCents > 0 && (
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <div className="flex items-baseline justify-between flex-1 gap-2">
                      <span className="text-xs text-gray-500">VIP workshop savings</span>
                      <span className="text-sm font-medium text-green-600">
                        -{formatQuoteAmount(opt.totalVipWorkshopSavingsCents, currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
