/**
 * Trip Cost Calculator — Ticket Section
 * Ticket type selector with live Stripe pricing and stage comparison
 */

import React from 'react';
import { Ticket, Crown, GraduationCap, Check } from 'lucide-react';
import { CalculatorSection, formatAmount, toDisplayCurrency } from './CalculatorWidgets';
import { CURRENCY_META, type TicketType, type DisplayCurrency } from '@/config/trip-cost';
import type { TicketPlan } from '@/hooks/useTicketPricing';
import type { ExchangeRates } from '@/lib/trip-cost/use-exchange-rate';

interface TicketSectionProps {
  ticketType: TicketType;
  chfPlans: TicketPlan[];
  /** Native Stripe plans for the selected currency (EUR/GBP), empty if not applicable */
  nativePlans: TicketPlan[];
  displayCurrency: DisplayCurrency;
  rates: ExchangeRates;
  stageDisplayName: string | null;
  isLoading: boolean;
  onSelect: (type: TicketType) => void;
}

/** Get the display price for a plan using actual native Stripe prices when available */
function getPlanDisplayPrice(
  planId: string,
  chfPlans: TicketPlan[],
  nativePlans: TicketPlan[],
  displayCurrency: DisplayCurrency,
  rates: ExchangeRates,
): string | null {
  // When a non-CHF currency with native pricing is selected, prefer Stripe prices
  if (displayCurrency !== 'CHF' && CURRENCY_META[displayCurrency].hasNativePricing && nativePlans.length > 0) {
    const nativePlan = nativePlans.find((p) => p.id === planId);
    if (nativePlan) return formatAmount(Math.round(nativePlan.price / 100), displayCurrency);
  }

  const chfPlan = chfPlans.find((p) => p.id === planId);
  if (!chfPlan) return null;
  const chf = Math.round(chfPlan.price / 100);
  const display = toDisplayCurrency(chf, displayCurrency, rates);
  if (display === null) return formatAmount(chf, 'CHF');
  // Prefix with ~ for converted (non-native) currencies
  const isConverted = displayCurrency !== 'CHF' && (!CURRENCY_META[displayCurrency].hasNativePricing || nativePlans.length === 0);
  return `${isConverted ? '~' : ''}${formatAmount(display, displayCurrency)}`;
}

/** Get compare (late bird) price for a plan */
function getCompareLabel(
  planId: string,
  chfPlans: TicketPlan[],
  nativePlans: TicketPlan[],
  displayCurrency: DisplayCurrency,
  rates: ExchangeRates,
): string | null {
  // Use native compare price if available
  if (displayCurrency !== 'CHF' && CURRENCY_META[displayCurrency].hasNativePricing && nativePlans.length > 0) {
    const nativePlan = nativePlans.find((p) => p.id === planId);
    if (nativePlan?.comparePrice) {
      return formatAmount(Math.round(nativePlan.comparePrice / 100), displayCurrency);
    }
  }

  const chfPlan = chfPlans.find((p) => p.id === planId);
  if (!chfPlan?.comparePrice) return null;
  const chf = Math.round(chfPlan.comparePrice / 100);
  const display = toDisplayCurrency(chf, displayCurrency, rates);
  if (display === null) return formatAmount(chf, 'CHF');
  return formatAmount(display, displayCurrency);
}

interface TicketButtonProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  price: string | null;
  comparePrice?: string | null;
  isSelected: boolean;
  isLoading: boolean;
  onClick: () => void;
}

function TicketButton({
  icon,
  label,
  sublabel,
  price,
  comparePrice,
  isSelected,
  isLoading,
  onClick,
}: TicketButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`cursor-pointer w-full text-left px-4 py-3 rounded-lg border transition-colors ${
        isSelected
          ? 'border-black bg-gray-50'
          : 'border-gray-200 bg-white hover:border-gray-400'
      }`}
      aria-pressed={isSelected}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-medium text-gray-900">{label}</span>
          </div>
          {sublabel && <span className="block text-xs text-gray-400 mt-0.5 pl-6">{sublabel}</span>}
        </div>
        {price !== undefined && (
          <div className="text-right shrink-0">
            <span className="text-sm font-bold text-gray-900">
              {isLoading ? '...' : price}
            </span>
            {comparePrice && !isLoading && (
              <span className="block text-[11px] text-gray-400 line-through">
                {comparePrice} at Late Bird
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

export function TicketSection({
  ticketType,
  chfPlans,
  nativePlans,
  displayCurrency,
  rates,
  stageDisplayName,
  isLoading,
  onSelect,
}: TicketSectionProps) {
  const stdPrice = getPlanDisplayPrice('standard', chfPlans, nativePlans, displayCurrency, rates);
  const stdCompare = getCompareLabel('standard', chfPlans, nativePlans, displayCurrency, rates);
  const studentPrice = getPlanDisplayPrice('standard_student_unemployed', chfPlans, nativePlans, displayCurrency, rates);
  const vipPrice = getPlanDisplayPrice('vip', chfPlans, nativePlans, displayCurrency, rates);
  const vipCompare = getCompareLabel('vip', chfPlans, nativePlans, displayCurrency, rates);

  return (
    <CalculatorSection icon={<Ticket className="w-5 h-5" />} title="Ticket">
      <div className="space-y-2">
        <TicketButton
          icon={<Ticket className="w-4 h-4 text-gray-600" />}
          label="Standard"
          sublabel={stageDisplayName ?? undefined}
          price={stdPrice}
          comparePrice={stdCompare}
          isSelected={ticketType === 'standard'}
          isLoading={isLoading}
          onClick={() => onSelect('standard')}
        />

        <TicketButton
          icon={<Crown className="w-4 h-4 text-amber-600" />}
          label="VIP"
          sublabel="main day + activities with speakers on Sep 12th"
          price={vipPrice}
          comparePrice={vipCompare}
          isSelected={ticketType === 'vip'}
          isLoading={isLoading}
          onClick={() => onSelect('vip')}
        />

        <TicketButton
          icon={<GraduationCap className="w-4 h-4 text-blue-600" />}
          label="Student / Unemployed"
          price={studentPrice}
          isSelected={ticketType === 'student'}
          isLoading={isLoading}
          onClick={() => onSelect('student')}
        />

        <button
          onClick={() => onSelect('have_ticket')}
          className={`cursor-pointer w-full text-left px-4 py-3 rounded-lg border transition-colors ${
            ticketType === 'have_ticket'
              ? 'border-black bg-gray-50'
              : 'border-gray-200 bg-white hover:border-gray-400'
          }`}
          aria-pressed={ticketType === 'have_ticket'}
        >
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-brand-green" />
            <span className="text-sm font-medium text-gray-900">I already have a ticket</span>
          </div>
        </button>
      </div>

    </CalculatorSection>
  );
}
