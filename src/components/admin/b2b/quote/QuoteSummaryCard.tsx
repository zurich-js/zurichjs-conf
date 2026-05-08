/**
 * Quote Summary Card
 * Dark sticky sidebar showing computed breakdown for all quote options
 */

import { Share2, Check, Crown, Sparkles } from 'lucide-react';
import type { QuoteBreakdown, QuoteOptionBreakdown, QuoteCurrency } from '@/lib/types/b2b-quote';
import { formatQuoteAmount } from '@/lib/b2b/quote-calculations';

interface QuoteSummaryCardProps {
  breakdown: QuoteBreakdown;
  companyName: string;
  validUntil: string;
  copied: boolean;
  onShare: () => void;
}

// ---------------------------------------------------------------------------
// Breakdown row (label + amount)
// ---------------------------------------------------------------------------

function Row({
  label,
  amount,
  sublabel,
  dimmed,
  negative,
  currency,
}: {
  label: string;
  amount: number;
  sublabel?: string;
  dimmed?: boolean;
  negative?: boolean;
  currency: QuoteCurrency;
}) {
  return (
    <div className={`flex items-start justify-between ${dimmed ? 'opacity-40' : ''}`}>
      <div>
        <span className="text-sm text-brand-gray-light">{label}</span>
        {sublabel && <span className="block text-xs text-brand-gray-medium">{sublabel}</span>}
      </div>
      <span className={`text-sm font-medium shrink-0 ml-4 ${negative ? 'text-green-400' : 'text-white'}`}>
        {negative && amount > 0 ? '-' : ''}{formatQuoteAmount(Math.abs(amount), currency)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single option section
// ---------------------------------------------------------------------------

function OptionSection({
  opt,
  isBestValue,
  currency,
  showLabel,
}: {
  opt: QuoteOptionBreakdown;
  isBestValue: boolean;
  currency: QuoteCurrency;
  showLabel: boolean;
}) {
  const hasTickets = opt.standardTickets.quantity > 0 || opt.vipTickets.quantity > 0;

  return (
    <div>
      {showLabel && (
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white">{opt.title || 'Untitled Option'}</h3>
          {isBestValue && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium">
              <Sparkles className="w-3 h-3" /> Best value
            </span>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        {opt.standardTickets.quantity > 0 && (
          <Row
            label={`Standard tickets (${opt.standardTickets.quantity}×)`}
            sublabel={opt.standardTickets.discountPercent > 0
              ? `${formatQuoteAmount(opt.standardTickets.unitPriceCents, currency)}/ea, ${opt.standardTickets.discountPercent}% off`
              : `${formatQuoteAmount(opt.standardTickets.unitPriceCents, currency)}/ea`}
            amount={opt.standardTickets.netCents}
            currency={currency}
          />
        )}

        {opt.vipTickets.quantity > 0 && (
          <Row
            label={`VIP tickets (${opt.vipTickets.quantity}×)`}
            sublabel={opt.vipTickets.discountPercent > 0
              ? `${formatQuoteAmount(opt.vipTickets.unitPriceCents, currency)}/ea, ${opt.vipTickets.discountPercent}% off`
              : `${formatQuoteAmount(opt.vipTickets.unitPriceCents, currency)}/ea`}
            amount={opt.vipTickets.netCents}
            currency={currency}
          />
        )}

        {opt.workshops.map((ws) => (
          <Row
            key={ws.workshopId}
            label={`${ws.title || 'Workshop'} (${ws.quantity}×)`}
            sublabel={ws.vipSavingsCents > 0
              ? `incl. VIP discount -${formatQuoteAmount(ws.vipSavingsCents, currency)}`
              : undefined}
            amount={ws.netCents}
            currency={currency}
          />
        ))}

        {opt.customLineItems.map((item) => (
          <Row
            key={item.id}
            label={`${item.label || 'Custom item'} (${item.quantity}×)`}
            amount={item.subtotalCents}
            currency={currency}
          />
        ))}

        {opt.customDiscounts.map((d) => (
          <Row
            key={d.id}
            label={d.label || 'Discount'}
            amount={d.amountCents}
            negative
            currency={currency}
          />
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-brand-gray-dark mt-3 pt-3">
        {opt.totalDiscountCents > 0 && (
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-green-400">Total savings</span>
            <span className="text-xs font-medium text-green-400">
              -{formatQuoteAmount(opt.totalDiscountCents, currency)}
            </span>
          </div>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-brand-gray-light">Total</span>
          <span className="text-lg font-bold text-white">
            {formatQuoteAmount(opt.totalCents, currency)}
          </span>
        </div>
        {hasTickets && (
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs text-brand-gray-medium">Per person ({opt.totalPeople})</span>
            <span className="text-xs text-brand-gray-light">
              {formatQuoteAmount(opt.perPersonCents, currency)}
            </span>
          </div>
        )}
      </div>

      {/* VIP benefits */}
      {opt.vipBenefits.length > 0 && (
        <div className="mt-3 p-3 bg-brand-gray-darkest rounded-lg">
          <div className="flex items-center gap-1.5 mb-2">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-amber-400">VIP Benefits</span>
          </div>
          <ul className="space-y-1">
            {opt.vipBenefits.map((b) => (
              <li key={b} className="text-xs text-brand-gray-light flex items-start gap-1.5">
                <span className="text-amber-400 mt-0.5">•</span>
                {b}
              </li>
            ))}
          </ul>
          {opt.totalVipWorkshopSavingsCents > 0 && (
            <p className="text-xs text-green-400 mt-2">
              Workshop VIP savings: -{formatQuoteAmount(opt.totalVipWorkshopSavingsCents, currency)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main card
// ---------------------------------------------------------------------------

export function QuoteSummaryCard({
  breakdown,
  companyName,
  validUntil,
  copied,
  onShare,
}: QuoteSummaryCardProps) {
  const { options, bestValueIndex, currency } = breakdown;
  const showLabels = options.length > 1;

  return (
    <div className="lg:sticky lg:top-28">
      <div className="bg-black rounded-2xl p-5 sm:p-6 text-white">
        {/* Header */}
        <div className="mb-4 sm:mb-5">
          <h2 className="text-sm font-medium text-brand-gray-light">
            {companyName ? `Quote for ${companyName}` : 'Quote Summary'}
          </h2>
          {validUntil && (
            <p className="text-[11px] text-brand-gray-medium mt-1">
              Valid until {validUntil}
            </p>
          )}
        </div>

        {/* Option breakdowns */}
        {options.length === 0 ? (
          <p className="text-sm text-brand-gray-medium">Add an option to see the breakdown</p>
        ) : (
          <div className="space-y-6">
            {options.map((opt, idx) => (
              <OptionSection
                key={opt.optionId}
                opt={opt}
                isBestValue={idx === bestValueIndex && options.length > 1}
                currency={currency}
                showLabel={showLabels}
              />
            ))}
          </div>
        )}

        {/* Share button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onShare}
            className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-brand-gray-light hover:text-white border border-brand-gray-dark hover:border-brand-gray-medium transition-colors"
          >
            {copied ? (
              <><Check className="w-4 h-4" />Link copied!</>
            ) : (
              <><Share2 className="w-4 h-4" />Share this quote</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
