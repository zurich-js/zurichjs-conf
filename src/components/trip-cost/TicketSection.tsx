/**
 * Trip Cost Calculator — Ticket Section
 * Ticket type selector with live Stripe pricing and stage comparison
 */

import React from 'react';
import { Ticket, Crown, GraduationCap, Check, TrendingUp } from 'lucide-react';
import { CalculatorSection, formatAmount, toDisplayCurrency } from './CalculatorWidgets';
import type { TicketType, DisplayCurrency } from '@/config/trip-cost';
import type { TicketPlan } from '@/hooks/useTicketPricing';

interface TicketSectionProps {
  ticketType: TicketType;
  chfPlans: TicketPlan[];
  eurPlans: TicketPlan[];
  displayCurrency: DisplayCurrency;
  eurRate: number;
  stageDisplayName: string | null;
  isLoading: boolean;
  onSelect: (type: TicketType) => void;
}

/** Get the display price for a plan using actual EUR Stripe prices when available */
function getPlanDisplayPrice(
  planId: string,
  chfPlans: TicketPlan[],
  eurPlans: TicketPlan[],
  displayCurrency: DisplayCurrency,
  eurRate: number,
): string | null {
  // When EUR is selected, prefer actual EUR prices from Stripe
  if (displayCurrency === 'EUR' && eurPlans.length > 0) {
    const eurPlan = eurPlans.find((p) => p.id === planId);
    if (eurPlan) return formatAmount(Math.round(eurPlan.price / 100), 'EUR');
  }

  const chfPlan = chfPlans.find((p) => p.id === planId);
  if (!chfPlan) return null;
  const chf = Math.round(chfPlan.price / 100);
  return formatAmount(toDisplayCurrency(chf, displayCurrency, eurRate), displayCurrency);
}

/** Get compare (late bird) price for a plan */
function getCompareLabel(
  planId: string,
  chfPlans: TicketPlan[],
  eurPlans: TicketPlan[],
  displayCurrency: DisplayCurrency,
  eurRate: number,
): string | null {
  // Use EUR compare price if available
  if (displayCurrency === 'EUR' && eurPlans.length > 0) {
    const eurPlan = eurPlans.find((p) => p.id === planId);
    if (eurPlan?.comparePrice) {
      return formatAmount(Math.round(eurPlan.comparePrice / 100), 'EUR');
    }
  }

  const chfPlan = chfPlans.find((p) => p.id === planId);
  if (!chfPlan?.comparePrice) return null;
  const chf = Math.round(chfPlan.comparePrice / 100);
  return formatAmount(toDisplayCurrency(chf, displayCurrency, eurRate), displayCurrency);
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {sublabel && <span className="text-xs text-gray-400">{sublabel}</span>}
        </div>
        {price !== undefined && (
          <div className="text-right shrink-0 ml-2">
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
  eurPlans,
  displayCurrency,
  eurRate,
  stageDisplayName,
  isLoading,
  onSelect,
}: TicketSectionProps) {
  const stdPrice = getPlanDisplayPrice('standard', chfPlans, eurPlans, displayCurrency, eurRate);
  const stdCompare = getCompareLabel('standard', chfPlans, eurPlans, displayCurrency, eurRate);
  const studentPrice = getPlanDisplayPrice('standard_student_unemployed', chfPlans, eurPlans, displayCurrency, eurRate);
  const vipPrice = getPlanDisplayPrice('vip', chfPlans, eurPlans, displayCurrency, eurRate);
  const vipCompare = getCompareLabel('vip', chfPlans, eurPlans, displayCurrency, eurRate);

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
          sublabel="main day + activities with speakers on Sep 12"
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
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-900">I already have a ticket</span>
          </div>
        </button>
      </div>

      {/* Price evolution hint */}
      {stdCompare && ticketType !== 'have_ticket' && (
        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <TrendingUp className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">
            <strong>Book early to save!</strong> Ticket prices increase through stages.
            At Late Bird pricing, you&apos;d pay {stdCompare} for Standard
            {vipCompare ? ` and ${vipCompare} for VIP` : ''}.
          </p>
        </div>
      )}
    </CalculatorSection>
  );
}
