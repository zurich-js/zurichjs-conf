/**
 * Trip Cost Calculator Page
 *
 * Helps potential attendees estimate the total cost of attending
 * ZurichJS Conf 2026: ticket + travel + hotel.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { Share2, Check, ArrowRight, TrendingUp } from 'lucide-react';
import { SEO, generateBreadcrumbSchema } from '@/components/SEO';
import { NavBar } from '@/components/organisms/NavBar';
import { DynamicSiteFooter } from '@/components/organisms/DynamicSiteFooter';
import { ShapedSection } from '@/components/organisms/ShapedSection';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import { Button } from '@/components/atoms/Button';
import { Heading } from '@/components/atoms/Heading';
import { Kicker } from '@/components/atoms/Kicker';
import {
  BreakdownRow,
  SpendLessTips,
  formatAmount,
  toDisplayCurrency,
  secondaryCurrencyLabel,
} from '@/components/trip-cost/CalculatorWidgets';
import { TicketSection } from '@/components/trip-cost/TicketSection';
import { TravelSection } from '@/components/trip-cost/TravelSection';
import { HotelSection } from '@/components/trip-cost/HotelSection';
import {
  DEFAULT_TICKET_PRICE_CHF,
  TRAVEL_RANGES,
  DEFAULT_NIGHTS,
  DEFAULT_CUSTOM_HOTEL_CHF,
  type DisplayCurrency,
  type TicketType,
} from '@/config/trip-cost';
import {
  computeTripCost,
  encodeToSearchParams,
  decodeFromSearchParams,
  getTotalBucket,
  type TripCostInput,
} from '@/lib/trip-cost/calculations';
import { useExchangeRate } from '@/lib/trip-cost/use-exchange-rate';
import { createTicketPricingQueryOptions } from '@/lib/queries/tickets';
import { useCurrency } from '@/contexts/CurrencyContext';
import { analytics } from '@/lib/analytics/client';

/** Default form state */
const DEFAULT_INPUT: TripCostInput = {
  ticketCHF: DEFAULT_TICKET_PRICE_CHF,
  hasTicket: false,
  ticketType: 'standard',
  travelRegion: 'europe',
  travelStep: 1,
  nights: DEFAULT_NIGHTS,
  hotelType: 'ibis',
  customHotelCHF: DEFAULT_CUSTOM_HOTEL_CHF,
  originAirport: null,
  displayCurrency: 'CHF',
};

export default function TripCostPage() {
  const router = useRouter();
  const [input, setInput] = useState<TripCostInput>(DEFAULT_INPUT);
  const [copied, setCopied] = useState(false);
  const trackedView = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { eurRate, rateDate, rateSource, isFallback } = useExchangeRate();
  const { currency: detectedCurrency } = useCurrency();

  // Dual pricing queries — CHF for calculations, EUR for display
  const chfQuery = useQuery(createTicketPricingQueryOptions('CHF'));
  const eurQuery = useQuery(createTicketPricingQueryOptions('EUR'));
  const chfPlans = chfQuery.data?.plans ?? [];
  const eurPlans = eurQuery.data?.plans ?? [];
  const stageDisplayName = chfQuery.data?.stageDisplayName ?? null;
  const ticketLoading = chfQuery.isLoading;

  const displayCurrency: DisplayCurrency =
    input.displayCurrency ?? (detectedCurrency === 'EUR' ? 'EUR' : 'CHF');

  // CHF prices for calculations
  const findPriceCHF = (planId: string) => {
    const plan = chfPlans.find((p) => p.id === planId);
    return plan ? Math.round(plan.price / 100) : 0;
  };
  const standardPriceCHF = findPriceCHF('standard') || DEFAULT_TICKET_PRICE_CHF;
  const studentPriceCHF = findPriceCHF('standard_student_unemployed') || DEFAULT_TICKET_PRICE_CHF;
  const vipPriceCHF = findPriceCHF('vip');

  // Apply Stripe price and geo-currency on mount
  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || ticketLoading || chfPlans.length === 0) return;
    appliedInitial.current = true;
    setInput((prev) => {
      const next = { ...prev };
      if (prev.ticketCHF === DEFAULT_TICKET_PRICE_CHF && prev.ticketType === 'standard') {
        next.ticketCHF = standardPriceCHF;
      }
      return next;
    });
  }, [ticketLoading, chfPlans, standardPriceCHF]);

  useEffect(() => {
    if (detectedCurrency === 'EUR') {
      setInput((prev) => {
        if (!prev.displayCurrency) return { ...prev, displayCurrency: 'EUR' };
        return prev;
      });
    }
  }, [detectedCurrency]);

  useEffect(() => {
    if (!router.isReady) return;
    const params = new URLSearchParams(window.location.search);
    if (params.toString()) {
      const decoded = decodeFromSearchParams(params);
      setInput((prev) => ({ ...prev, ...decoded }));
    }
  }, [router.isReady]);

  useEffect(() => {
    if (trackedView.current) return;
    trackedView.current = true;
    try {
      analytics.track('page_viewed', {
        page_path: '/trip-cost',
        page_name: 'Trip Cost Calculator',
        page_category: 'other',
      } as never);
    } catch { /* OK */ }
  }, []);

  const trackUpdate = useCallback((next: TripCostInput) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const bd = computeTripCost(next, eurRate);
      try {
        analytics.track('button_clicked', {
          button_name: 'trip_cost_updated',
          button_location: 'trip_cost_calculator',
          button_variant: next.travelRegion,
          destination_url: undefined,
        } as never);
      } catch { /* OK */ }
      try {
        const ph = analytics.getInstance();
        ph.capture('trip_cost_updated', {
          region: next.travelRegion,
          nights: next.nights,
          hotel_type: next.hotelType,
          ticket_type: next.ticketType,
          total_bucket: getTotalBucket(bd.totalCHF),
          currency: next.displayCurrency,
        });
      } catch { /* OK */ }
    }, 800);
  }, [eurRate]);

  const update = useCallback(
    (partial: Partial<TripCostInput>) => {
      setInput((prev) => {
        const next = { ...prev, ...partial };
        trackUpdate(next);
        return next;
      });
    },
    [trackUpdate]
  );

  /** Handle ticket type change — sets price and adjusts recommended nights */
  const handleTicketType = useCallback(
    (type: TicketType) => {
      const partial: Partial<TripCostInput> = { ticketType: type };
      if (type === 'have_ticket') {
        partial.hasTicket = true;
        partial.ticketCHF = 0;
      } else {
        partial.hasTicket = false;
        if (type === 'vip') {
          partial.ticketCHF = vipPriceCHF;
          partial.nights = 3; // VIP includes activities on Sep 12
        } else if (type === 'student') {
          partial.ticketCHF = studentPriceCHF;
          partial.nights = 2;
        } else {
          partial.ticketCHF = standardPriceCHF;
          partial.nights = 2;
        }
      }
      update(partial);
    },
    [update, standardPriceCHF, studentPriceCHF, vipPriceCHF]
  );

  const breakdown = computeTripCost(input, eurRate);

  const handleShare = useCallback(async () => {
    const params = encodeToSearchParams(input);
    const url = `${window.location.origin}/trip-cost?${params.toString()}`;
    window.history.replaceState(null, '', `/trip-cost?${params.toString()}`);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy this link:', url);
    }
    try {
      const ph = analytics.getInstance();
      ph.capture('trip_cost_cta_clicked', { action: 'share' });
    } catch { /* OK */ }
  }, [input]);

  const handleGetTickets = () => {
    try {
      const ph = analytics.getInstance();
      ph.capture('trip_cost_cta_clicked', { action: 'get_tickets' });
    } catch { /* OK */ }
    router.push('/#tickets');
  };

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Trip Cost Calculator', url: '/trip-cost' },
  ]);

  const ticketType = input.ticketType ?? 'standard';

  return (
    <>
      <SEO
        title="Trip Cost Calculator — Estimate Your Total Cost"
        description="Estimate the total cost of attending ZurichJS Conf 2026: ticket, travel, and hotel. Plan your budget in under 30 seconds."
        canonical="/trip-cost"
        keywords="zurichjs cost, javascript conference cost, zurich travel cost, conference budget planner"
        jsonLd={[breadcrumbSchema]}
      />
      <NavBar />

      <main className="min-h-screen bg-white pt-28 pb-32 md:pt-36 md:pb-40">
        <SectionContainer>
          {/* Page header */}
          <div className="max-w-3xl mb-12 md:mb-16">
            <Kicker variant="light">Trip Cost Calculator</Kicker>
            <Heading level="h1" className="mt-3 mb-4">
              How much does ZurichJS Conf cost in total?
            </Heading>
            <p className="text-lg text-gray-600 leading-relaxed">
              Estimate ticket + travel + hotel in under 30 seconds.
              All prices are estimates — your actual costs may vary.
            </p>

            {/* Currency toggle — centered pill */}
            <div className="flex justify-center mt-6">
              <div className="inline-flex bg-black rounded-full p-1">
                {(['CHF', 'EUR'] as DisplayCurrency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ displayCurrency: c })}
                    className={`cursor-pointer px-4 py-1.5 text-sm font-bold rounded-full transition-colors ${
                      displayCurrency === c
                        ? 'bg-brand-yellow-main text-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    aria-pressed={displayCurrency === c}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Left column — Inputs */}
            <div className="lg:col-span-3 space-y-8">
              {/* A) Ticket type selector */}
              <TicketSection
                ticketType={ticketType}
                chfPlans={chfPlans}
                eurPlans={eurPlans}
                displayCurrency={displayCurrency}
                eurRate={eurRate}
                stageDisplayName={stageDisplayName}
                isLoading={ticketLoading}
                onSelect={handleTicketType}
              />

              {/* B) Travel */}
              <TravelSection
                travelRegion={input.travelRegion}
                travelStep={input.travelStep}
                originAirport={input.originAirport ?? null}
                currency={displayCurrency}
                eurRate={eurRate}
                onUpdate={update}
              />

              {/* C) Hotel */}
              <HotelSection
                nights={input.nights}
                hotelType={input.hotelType}
                customHotelCHF={input.customHotelCHF}
                currency={displayCurrency}
                eurRate={eurRate}
                ticketType={ticketType}
                onUpdate={update}
              />
            </div>

            {/* Right column — Breakdown summary */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-28">
                <div className="bg-black rounded-2xl p-6 text-white">
                  <h2 className="text-sm font-medium text-brand-gray-light mb-5">
                    Estimated breakdown
                  </h2>

                  <div className="space-y-4">
                    <BreakdownRow
                      label={
                        ticketType === 'have_ticket'
                          ? 'Ticket (already have)'
                          : ticketType === 'student'
                            ? 'Ticket (student)'
                            : `Ticket (${ticketType})`
                      }
                      chf={breakdown.ticketCHF}
                      dimmed={ticketType === 'have_ticket'}
                      currency={displayCurrency}
                      eurRate={eurRate}
                    />
                    <BreakdownRow
                      label={`Travel (${TRAVEL_RANGES[input.travelRegion].label.toLowerCase()})`}
                      chf={breakdown.travelCHF}
                      currency={displayCurrency}
                      eurRate={eurRate}
                    />
                    <BreakdownRow
                      label={`Hotel (${breakdown.nights} night${breakdown.nights !== 1 ? 's' : ''})`}
                      chf={breakdown.hotelTotalCHF}
                      sublabel={
                        breakdown.hotelPerNightCHF > 0
                          ? `${formatAmount(toDisplayCurrency(breakdown.hotelPerNightCHF, displayCurrency, eurRate), displayCurrency)} × ${breakdown.nights}`
                          : undefined
                      }
                      currency={displayCurrency}
                      eurRate={eurRate}
                    />

                    <div className="border-t border-brand-gray-dark pt-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium text-brand-gray-light">
                          Estimated total
                        </span>
                        <div className="text-right">
                          <span className="text-2xl font-bold">
                            {formatAmount(
                              toDisplayCurrency(breakdown.totalCHF, displayCurrency, eurRate),
                              displayCurrency
                            )}
                          </span>
                          <span className="block text-sm text-brand-gray-light mt-0.5">
                            {secondaryCurrencyLabel(breakdown.totalCHF, displayCurrency, eurRate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-brand-gray-medium mt-4">
                    1 CHF ≈ {eurRate} EUR · {rateSource}
                    {rateDate && !isFallback && ` · ${rateDate}`}
                  </p>

                  {/* Price trends warning */}
                  <div className="mt-4 bg-amber-900/30 border border-amber-700/40 rounded-lg px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-amber-200 leading-relaxed">
                        Flights and hotels typically get <strong>20-40% more expensive</strong> closer
                        to the event. Book early for the best rates on everything.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 space-y-3">
                    <Button
                      variant="primary"
                      size="lg"
                      onClick={handleGetTickets}
                      className="w-full justify-center"
                    >
                      Grab a ticket
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                    <button
                      onClick={handleShare}
                      className="cursor-pointer w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-brand-gray-light hover:text-white border border-brand-gray-dark hover:border-brand-gray-medium transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Link copied!
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4" />
                          Share this estimate
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <SpendLessTips />
              </div>
            </div>
          </div>
        </SectionContainer>
      </main>

      <ShapedSection shape="tighten" variant="dark" dropBottom>
        <DynamicSiteFooter />
      </ShapedSection>
    </>
  );
}
