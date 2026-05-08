/**
 * Sponsor Quote Summary Card
 * Dark sticky sidebar showing computed breakdown for all sponsor quote options
 */

import { Share2, Check, Lock, Star, Wallet } from 'lucide-react';
import type { SponsorQuoteCurrency } from '@/lib/types/sponsor-quote';
import type { SponsorQuoteBreakdown, SponsorQuoteOptionBreakdown } from '@/lib/types/sponsor-quote';
import { formatQuoteAmount } from '@/lib/sponsor/quote-calculations';
import { convertCHFToCurrency } from '@/lib/sponsor/quote-catalog';
import type { ExchangeRates } from '@/lib/trip-cost/use-exchange-rate';

interface SponsorQuoteSummaryCardProps {
  breakdown: SponsorQuoteBreakdown;
  rates: ExchangeRates;
  companyName: string;
  validUntil: string;
  copied: boolean;
  onShare: () => void;
}

/** Format a CHF amount: shows CHF primary, with converted estimate in brackets for non-CHF */
function fmtChf(chfCents: number): string {
  return formatQuoteAmount(chfCents, 'CHF');
}

function fmtEstimate(chfCents: number, currency: SponsorQuoteCurrency, rates: ExchangeRates): string | null {
  if (currency === 'CHF' || !rates[currency]) return null;
  const converted = convertCHFToCurrency(chfCents, currency, rates);
  return `~ ${formatQuoteAmount(converted, currency)}`;
}

function Row({ label, amount, sublabel, negative, amber, included, forgone, currency, rates }: {
  label: string; amount: number; sublabel?: string;
  negative?: boolean; amber?: boolean; included?: boolean; forgone?: boolean;
  currency: SponsorQuoteCurrency; rates: ExchangeRates;
}) {
  const sign = negative && amount > 0 ? '-' : amber && amount > 0 ? '+' : '';
  const estimate = fmtEstimate(Math.abs(amount), currency, rates);
  return (
    <div className="flex items-start justify-between">
      <div>
        <span className={`text-sm ${amber ? 'text-amber-400' : 'text-brand-gray-light'}`}>{label}</span>
        {sublabel && <span className="block text-xs text-brand-gray-medium">{sublabel}</span>}
      </div>
      {forgone ? (
        <span className="text-xs font-medium text-orange-400 shrink-0 ml-4 line-through">Forgone</span>
      ) : included ? (
        <span className="text-xs font-medium text-green-400 shrink-0 ml-4">Included</span>
      ) : (
        <div className="text-right shrink-0 ml-4">
          <span className={`text-sm font-medium ${negative ? 'text-green-400' : amber ? 'text-amber-400' : 'text-white'}`}>
            {sign}{fmtChf(Math.abs(amount))}
          </span>
          {estimate && (
            <span className="block text-[10px] text-brand-gray-medium">({sign}{estimate})</span>
          )}
        </div>
      )}
    </div>
  );
}

function OptionSection({ opt, isRecommended, currency, rates, showLabel }: {
  opt: SponsorQuoteOptionBreakdown; isRecommended: boolean;
  currency: SponsorQuoteCurrency; rates: ExchangeRates; showLabel: boolean;
}) {
  const categories = [...new Set(opt.items.map((i) => i.category))];
  const est = (chfCents: number) => fmtEstimate(chfCents, currency, rates);

  return (
    <div>
      {showLabel && (
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white">{opt.title || 'Untitled'}</h3>
          {isRecommended && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-primary/20 text-brand-primary text-[10px] font-medium">
              <Star className="w-3 h-3 fill-current" /> Recommended
            </span>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        {categories.map((category) =>
          opt.items.filter((i) => i.category === category).map((item) => (
            <div key={item.id}>
              <Row
                label={`${item.label}${(() => {
                  const kept = item.includedInTier ? item.quantity - item.forgoneQty : item.quantity;
                  return kept > 1 ? ` (${kept}×)` : kept <= 0 ? '' : '';
                })()}`}
                sublabel={
                  !item.includedInTier && item.discountPercent > 0
                    ? `${fmtChf(item.unitPriceCents)}${item.quantity > 1 ? '/ea' : ''}, ${item.discountPercent}% off`
                    : !item.includedInTier && item.quantity > 1
                      ? `${fmtChf(item.unitPriceCents)}/ea`
                      : undefined
                }
                amount={item.netCents}
                included={item.includedInTier}
                forgone={item.includedInTier && item.forgoneQty >= item.quantity}
                currency={currency} rates={rates}
              />
              {item.forgoneCreditCents > 0 && (
                <div className="ml-2 text-xs text-orange-400">
                  {item.forgoneQty}× forgone → +{fmtChf(item.forgoneCreditCents)} add-on credit
                </div>
              )}
              {item.exclusive && item.exclusivityPremiumCents > 0 && (
                <div className="flex items-center gap-1 mt-0.5 ml-2">
                  <Lock className="w-3 h-3 text-amber-400" />
                  <span className="text-xs text-amber-400">
                    Incl. exclusivity premium +{fmtChf(item.exclusivityPremiumCents)}
                  </span>
                </div>
              )}
            </div>
          )),
        )}

        {opt.customDiscounts.map((d) => (
          <Row key={d.id} label={d.label || 'Discount'} amount={d.amountCents} negative currency={currency} rates={rates} />
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-brand-gray-dark mt-3 pt-3">
        {opt.totalDiscountCents > 0 && (
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-green-400">Total savings</span>
            <div className="text-right">
              <span className="text-xs font-medium text-green-400">-{fmtChf(opt.totalDiscountCents)}</span>
              {est(opt.totalDiscountCents) && <span className="block text-[10px] text-brand-gray-medium">(-{est(opt.totalDiscountCents)})</span>}
            </div>
          </div>
        )}
        {opt.totalExclusivityCents > 0 && (
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-amber-400">Exclusivity premiums</span>
            <div className="text-right">
              <span className="text-xs font-medium text-amber-400">+{fmtChf(opt.totalExclusivityCents)}</span>
              {est(opt.totalExclusivityCents) && <span className="block text-[10px] text-brand-gray-medium">(+{est(opt.totalExclusivityCents)})</span>}
            </div>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-brand-gray-light">Total</span>
          <div className="text-right">
            <span className="text-lg font-bold text-white">{fmtChf(opt.totalCents)}</span>
            {est(opt.totalCents) && <span className="block text-xs text-brand-gray-medium">({est(opt.totalCents)})</span>}
          </div>
        </div>
      </div>

      {/* Add-on Budget Summary */}
      {opt.addOnBudgetCents > 0 && (
        <div className="mt-3 p-3 bg-brand-gray-darkest rounded-lg">
          <div className="flex items-center gap-1.5 mb-2">
            <Wallet className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-xs font-semibold text-blue-400">Add-on Budget</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-brand-gray-light">Base budget</span>
              <span className="text-white">{fmtChf(opt.addOnBudgetCents)}</span>
            </div>
            {opt.totalForgoneCents > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-orange-400">+ Forgone credits</span>
                <span className="text-orange-400">+{fmtChf(opt.totalForgoneCents)}</span>
              </div>
            )}
            {opt.totalForgoneCents > 0 && (
              <div className="flex justify-between text-xs border-t border-brand-gray-dark pt-1">
                <span className="text-brand-gray-light font-medium">Effective budget</span>
                <span className="text-white font-medium">{fmtChf(opt.effectiveBudgetCents)}</span>
              </div>
            )}
            {opt.addOnSpentCents > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-brand-gray-light">Allocated</span>
                <span className="text-white">{fmtChf(opt.addOnSpentCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className={opt.addOnRemainingCents < 0 ? 'text-red-400' : 'text-brand-gray-light'}>Remaining</span>
              <span className={opt.addOnRemainingCents < 0 ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>
                {fmtChf(opt.addOnRemainingCents)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Exclusive items */}
      {opt.exclusiveItemLabels.length > 0 && (
        <div className="mt-3 p-3 bg-brand-gray-darkest rounded-lg">
          <div className="flex items-center gap-1.5 mb-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">Exclusive Rights</span>
          </div>
          <ul className="space-y-1">
            {opt.exclusiveItemLabels.map((label) => (
              <li key={label} className="text-xs text-brand-gray-light flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5">•</span>{label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SponsorQuoteSummaryCard({ breakdown, rates, companyName, validUntil, copied, onShare }: SponsorQuoteSummaryCardProps) {
  const { options, recommendedIndex, currency } = breakdown;

  return (
    <div className="lg:sticky lg:top-28">
      <div className="bg-black rounded-2xl p-5 sm:p-6 text-white">
        <div className="mb-4 sm:mb-5">
          <h2 className="text-sm font-medium text-brand-gray-light">
            {companyName ? `Sponsor Quote for ${companyName}` : 'Sponsor Quote Summary'}
          </h2>
          {validUntil && <p className="text-[11px] text-brand-gray-medium mt-1">Valid until {validUntil}</p>}
        </div>

        {options.length === 0 ? (
          <p className="text-sm text-brand-gray-medium">Add an option to see the breakdown</p>
        ) : (
          <div className="space-y-6">
            {options.map((opt, idx) => (
              <OptionSection key={opt.optionId} opt={opt}
                isRecommended={idx === recommendedIndex && options.length > 1}
                currency={currency} rates={rates} showLabel={options.length > 1} />
            ))}
          </div>
        )}

        {currency !== 'CHF' && rates[currency] && (
          <p className="mt-4 text-[10px] text-brand-gray-medium leading-relaxed">
            Amounts shown in CHF. {currency} estimates based on current ECB exchange rate and rounded up — final invoiced amount may differ.
          </p>
        )}

        <div className="mt-4">
          <button type="button" onClick={onShare}
            className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-brand-gray-light hover:text-white border border-brand-gray-dark hover:border-brand-gray-medium transition-colors">
            {copied ? <><Check className="w-4 h-4" />Link copied!</> : <><Share2 className="w-4 h-4" />Share this quote</>}
          </button>
        </div>
      </div>
    </div>
  );
}
