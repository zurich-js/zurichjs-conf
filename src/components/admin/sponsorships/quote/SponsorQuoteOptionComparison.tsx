/**
 * Sponsor Quote Option Comparison
 * Side-by-side comparison cards when 2-3 options exist
 */

import { Star, Lock, TrendingDown, Wallet } from 'lucide-react';
import type { SponsorQuoteBreakdown } from '@/lib/types/sponsor-quote';
import { formatQuoteAmount } from '@/lib/sponsor/quote-calculations';

interface SponsorQuoteOptionComparisonProps {
  breakdown: SponsorQuoteBreakdown;
}

export function SponsorQuoteOptionComparison({ breakdown }: SponsorQuoteOptionComparisonProps) {
  const { options, recommendedIndex, currency } = breakdown;
  if (options.length < 2) return null;

  return (
    <section className="border border-gray-200 rounded-2xl p-5 sm:p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Comparison</h2>
      <div className={`grid gap-5 ${options.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {options.map((opt, idx) => {
          const isRec = idx === recommendedIndex;
          return (
            <div
              key={opt.optionId}
              className={`rounded-xl p-5 ${isRec ? 'bg-brand-primary/5 border-2 border-brand-primary' : 'bg-gray-50 border border-gray-200'}`}
            >
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900 truncate">
                  {opt.title || `Option ${idx + 1}`}
                </h3>
                {isRec && (
                  <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-brand-primary/20 text-black text-[10px] font-semibold">
                    <Star className="w-3 h-3 fill-current" /> Recommended
                  </span>
                )}
              </div>

              {/* Total */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <span className="block text-xs text-gray-500 mb-0.5">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatQuoteAmount(opt.totalCents, 'CHF')}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-baseline justify-between flex-1 gap-2">
                    <span className="text-xs text-gray-500">Items</span>
                    <span className="text-sm font-medium text-gray-800">{opt.items.length}</span>
                  </div>
                </div>

                {opt.totalDiscountCents > 0 && (
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    <div className="flex items-baseline justify-between flex-1 gap-2">
                      <span className="text-xs text-gray-500">Savings</span>
                      <span className="text-sm font-medium text-green-600">
                        -{formatQuoteAmount(opt.totalDiscountCents, 'CHF')}
                      </span>
                    </div>
                  </div>
                )}

                {opt.addOnBudgetCents > 0 && (
                  <div className="flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <div className="flex items-baseline justify-between flex-1 gap-2">
                      <span className="text-xs text-gray-500">Add-on budget</span>
                      <span className="text-sm font-medium text-blue-600">
                        {formatQuoteAmount(opt.addOnRemainingCents, 'CHF')} left
                      </span>
                    </div>
                  </div>
                )}

                {opt.exclusiveItemLabels.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs text-gray-600">
                      {opt.exclusiveItemLabels.length} exclusive item{opt.exclusiveItemLabels.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {opt.totalExclusivityCents > 0 && (
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <div className="flex items-baseline justify-between flex-1 gap-2">
                      <span className="text-xs text-gray-500">Exclusivity premiums</span>
                      <span className="text-sm font-medium text-amber-600">
                        +{formatQuoteAmount(opt.totalExclusivityCents, 'CHF')}
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
