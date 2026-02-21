/**
 * Trip Cost Calculator — Breakdown Summary Card
 * Shows cost breakdown, savings vs late bird, exchange rate info, and CTAs
 */

import React from 'react';
import { Share2, Check, ArrowRight, Info, AlertCircle } from 'lucide-react';
import { Button } from '@/components/atoms/Button';
import {
  BreakdownRow,
  SpendLessTips,
  formatAmount,
  toDisplayCurrency,
  secondaryCurrencyLabel,
} from './CalculatorWidgets';
import { TRAVEL_RANGES, CURRENCY_META, type DisplayCurrency, type TicketType } from '@/config/trip-cost';
import type { TripCostBreakdown } from '@/lib/trip-cost/calculations';
import type { ExchangeRates } from '@/lib/trip-cost/use-exchange-rate';
import type { TravelRegion } from '@/config/trip-cost';

interface BreakdownCardProps {
  breakdown: TripCostBreakdown;
  ticketType: TicketType;
  travelRegion: TravelRegion;
  displayCurrency: DisplayCurrency;
  rates: ExchangeRates;
  ticketNative: number | undefined;
  totalDisplayAmount: number | null;
  lateBirdDisplayAmount: number | null;
  rateDate: string | null;
  rateSource: string;
  needsRates: boolean;
  ratesLoading: boolean;
  ratesError: boolean;
  copied: boolean;
  breakdownRef: React.RefObject<HTMLDivElement | null>;
  onShare: () => void;
  onGetTickets: () => void;
}

export function BreakdownCard({
  breakdown,
  ticketType,
  travelRegion,
  displayCurrency,
  rates,
  ticketNative,
  totalDisplayAmount,
  lateBirdDisplayAmount,
  rateDate,
  rateSource,
  needsRates,
  ratesLoading,
  ratesError,
  copied,
  breakdownRef,
  onShare,
  onGetTickets,
}: BreakdownCardProps) {
  const isDisplayOnly = !CURRENCY_META[displayCurrency].hasNativePricing;
  const isConverted = displayCurrency !== 'CHF';
  const rate = rates[displayCurrency];
  const rateAvailable = !needsRates || rate !== undefined;

  return (
    <div className="lg:sticky lg:top-28">
      <div ref={breakdownRef} className="bg-black rounded-2xl p-5 sm:p-6 text-white">
        <h2 className="text-sm font-medium text-brand-gray-light mb-4 sm:mb-5">
          Estimated breakdown
        </h2>

        {needsRates && ratesLoading && (
          <div className="flex items-center gap-2 text-sm text-brand-gray-light mb-4">
            <div className="w-4 h-4 border-2 border-brand-gray-medium border-t-white rounded-full animate-spin" />
            Loading exchange rates...
          </div>
        )}
        {needsRates && ratesError && (
          <div className="flex items-start gap-2 text-sm text-brand-red mb-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Could not load exchange rates. Please try refreshing the page, or switch to CHF.</span>
          </div>
        )}

        <div className="space-y-3 sm:space-y-4">
          <BreakdownRow
            label={
              ticketType === 'have_ticket'
                ? 'Ticket (already have)'
                : ticketType === 'student'
                  ? 'Ticket (student)'
                  : `Ticket (${ticketType})`
            }
            chf={breakdown.ticketCHF}
            nativePrice={ticketNative}
            dimmed={ticketType === 'have_ticket'}
            currency={displayCurrency}
            rates={rates}
          />
          <BreakdownRow
            label={`Travel (${TRAVEL_RANGES[travelRegion].label.toLowerCase()})`}
            chf={breakdown.travelCHF}
            currency={displayCurrency}
            rates={rates}
          />
          <BreakdownRow
            label={`Hotel (${breakdown.nights} night${breakdown.nights !== 1 ? 's' : ''})`}
            chf={breakdown.hotelTotalCHF}
            sublabel={
              breakdown.hotelPerNightCHF > 0
                ? (() => {
                    const perNight = toDisplayCurrency(breakdown.hotelPerNightCHF, displayCurrency, rates);
                    if (perNight === null) return `CHF ${breakdown.hotelPerNightCHF} × ${breakdown.nights}`;
                    return `${isConverted ? '~' : ''}${formatAmount(perNight, displayCurrency)} × ${breakdown.nights}`;
                  })()
                : undefined
            }
            currency={displayCurrency}
            rates={rates}
          />

          <div className="border-t border-brand-gray-dark pt-3 sm:pt-4">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-brand-gray-light">Estimated total</span>
              <div className="text-right">
                {totalDisplayAmount !== null ? (
                  <>
                    <span className="text-xl sm:text-2xl font-bold">
                      {isConverted ? '~' : ''}{formatAmount(totalDisplayAmount, displayCurrency)}
                    </span>
                    {isConverted && (
                      <span className="block text-xs sm:text-sm text-brand-gray-light mt-0.5">
                        {secondaryCurrencyLabel(breakdown.totalCHF, displayCurrency)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-xl sm:text-2xl font-bold">{formatAmount(breakdown.totalCHF, 'CHF')}</span>
                )}
              </div>
            </div>
            {lateBirdDisplayAmount && totalDisplayAmount && lateBirdDisplayAmount > totalDisplayAmount && (
              <button
                onClick={() => document.getElementById('price-evolution')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="cursor-pointer flex items-center gap-1 text-[11px] text-brand-green mt-2 hover:underline"
              >
                <Info className="w-3 h-3 shrink-0" />
                You save {isConverted ? '~' : ''}{formatAmount(lateBirdDisplayAmount - totalDisplayAmount, displayCurrency)} ({Math.round(((lateBirdDisplayAmount - totalDisplayAmount) / lateBirdDisplayAmount) * 100)}%) vs. late bird pricing
              </button>
            )}
          </div>
        </div>

        {isDisplayOnly && (
          <p className="flex items-start gap-1.5 text-[11px] text-brand-yellow-main mt-4">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            You will be charged in CHF. {displayCurrency} amounts are approximate.
          </p>
        )}

        {rateAvailable && rate && (
          <p className="text-[11px] text-brand-gray-medium mt-4">
            1 CHF ≈ {rate} {displayCurrency} · {rateSource}
            {rateDate && ` · ${rateDate}`}
          </p>
        )}

        <div className="mt-6 space-y-3">
          <Button variant="primary" size="lg" onClick={onGetTickets} className="w-full justify-center">
            Grab a ticket
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
          <button
            onClick={onShare}
            className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-brand-gray-light hover:text-white border border-brand-gray-dark hover:border-brand-gray-medium transition-colors"
          >
            {copied ? (
              <><Check className="w-4 h-4" />Link copied!</>
            ) : (
              <><Share2 className="w-4 h-4" />Share this estimate</>
            )}
          </button>
        </div>
      </div>

      <SpendLessTips />
    </div>
  );
}
