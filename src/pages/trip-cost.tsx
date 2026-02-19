/**
 * Trip Cost Calculator Page
 *
 * Helps potential attendees estimate the total cost of attending
 * ZurichJS Conf 2026: ticket + travel + hotel.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { Share2, Check, ArrowRight, Info } from 'lucide-react';
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
  attendanceDays: 'main_only',
};

export default function TripCostPage() {
  const router = useRouter();
  const [input, setInput] = useState<TripCostInput>(DEFAULT_INPUT);
  const [copied, setCopied] = useState(false);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const breakdownRef = useRef<HTMLDivElement>(null);
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

  // EUR prices from Stripe (for display when EUR is selected)
  const findPriceEUR = (planId: string) => {
    const plan = eurPlans.find((p) => p.id === planId);
    return plan ? Math.round(plan.price / 100) : undefined;
  };
  const getTicketEUR = () => {
    if (input.hasTicket) return 0;
    const planId = input.ticketType === 'student' ? 'standard_student_unemployed' : input.ticketType;
    return findPriceEUR(planId ?? 'standard');
  };
  const ticketEUR = getTicketEUR();

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

  // Hide sticky mobile bar when the breakdown card is visible
  useEffect(() => {
    const el = breakdownRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setBreakdownVisible(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
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
        // Auto-select VIP ticket when "Full experience" attendance is chosen (VIP is a prerequisite)
        if (partial.attendanceDays === 'all_days' && prev.ticketType !== 'vip') {
          next.ticketType = 'vip';
          next.hasTicket = false;
          next.ticketCHF = vipPriceCHF;
        }
        trackUpdate(next);
        return next;
      });
    },
    [trackUpdate, vipPriceCHF]
  );

  /** Handle ticket type change — sets price only; nights are driven by attendance selector */
  const handleTicketType = useCallback(
    (type: TicketType) => {
      const partial: Partial<TripCostInput> = { ticketType: type };
      if (type === 'have_ticket') {
        partial.hasTicket = true;
        partial.ticketCHF = 0;
      } else {
        partial.hasTicket = false;
        partial.ticketCHF =
          type === 'vip' ? vipPriceCHF : type === 'student' ? studentPriceCHF : standardPriceCHF;
      }
      update(partial);
    },
    [update, standardPriceCHF, studentPriceCHF, vipPriceCHF]
  );

  const breakdown = computeTripCost(input, eurRate);
  const ticketType = input.ticketType ?? 'standard';

  // Compute display total for EUR using fetched ticket price + converted travel/hotel
  const totalDisplayAmount = displayCurrency === 'EUR'
    ? (ticketEUR ?? Math.round(breakdown.ticketCHF * eurRate)) +
      Math.round(breakdown.travelCHF * eurRate) +
      Math.round(breakdown.hotelTotalCHF * eurRate)
    : breakdown.totalCHF;

  // Price evolution — ticket from Stripe comparePrice, hotel/flight estimated increases
  // For student/unemployed, skip ticket price evolution (only hotel + travel)
  const isStudentOrHaveTicket = ticketType === 'student' || ticketType === 'have_ticket';
  const getLateBirdTicketCHF = () => {
    if (isStudentOrHaveTicket) return breakdown.ticketCHF;
    const plan = chfPlans.find((p) => p.id === ticketType);
    if (plan?.comparePrice) return Math.round(plan.comparePrice / 100);
    return null;
  };
  const lateBirdTicketCHF = getLateBirdTicketCHF();

  // Estimated increases: hotel +10%/+25%, flights +15%/+30% at standard/late bird
  // For student: ticket stays the same, only travel+hotel increase
  const midTicketCHF = lateBirdTicketCHF !== null
    ? (isStudentOrHaveTicket
        ? breakdown.ticketCHF
        : Math.round(breakdown.ticketCHF + (lateBirdTicketCHF - breakdown.ticketCHF) * 0.4))
    : null;
  const standardEstTotalCHF = midTicketCHF !== null
    ? Math.round(midTicketCHF + breakdown.travelCHF * 1.25 + breakdown.hotelTotalCHF * 1.20)
    : null;
  const lateBirdTotalCHF = lateBirdTicketCHF !== null
    ? Math.round(lateBirdTicketCHF + breakdown.travelCHF * 1.30 + breakdown.hotelTotalCHF * 1.25)
    : null;

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

      <main className="min-h-screen bg-white pt-24 pb-36 md:pt-36 lg:pb-40 overflow-x-hidden">
        <SectionContainer>
          {/* Page header */}
          <div className="max-w-3xl mb-8 md:mb-16">
            <Kicker variant="light">Trip Cost Calculator</Kicker>
            <Heading level="h1" className="mt-3 mb-3 md:mb-4">
              How much does ZurichJS Conf cost in total?
            </Heading>
            <p className="text-base md:text-lg text-gray-600 leading-relaxed">
              Estimate ticket + travel + hotel in under 30 seconds.
              All prices are estimates — your actual costs may vary.
            </p>
            <p className="text-sm text-gray-500 mt-3">
              Travelling to Switzerland is very accessible — check our{' '}
              <Link href="/faq" className="underline hover:text-gray-700 transition-colors">FAQ</Link>{' '}
              for visa, transport and entry tips.
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
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12">
            {/* Left column — Inputs */}
            <div className="lg:col-span-3 space-y-6 md:space-y-8">
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
                attendanceDays={input.attendanceDays ?? 'main_only'}
                onUpdate={update}
              />

              {/* D) Price evolution — below hotel, outside breakdown card */}
              {lateBirdTotalCHF && standardEstTotalCHF && (
                <div id="price-evolution" className="border border-gray-200 rounded-2xl p-5 sm:p-6">
                  <h2 className="text-base font-semibold text-gray-900 mb-5">
                    Price evolution
                  </h2>
                  <div className="relative mb-6">
                    <div className="absolute top-[11px] left-[14px] right-[14px] h-1.5 rounded-full bg-gradient-to-r from-brand-green via-brand-yellow-main to-brand-red" />
                    <div className="relative flex justify-between">
                      <div className="text-center z-10 max-w-[30%]">
                        <div className="w-6 h-6 rounded-full bg-brand-green border-2 border-white shadow mx-auto" />
                        <span className="block text-[11px] sm:text-xs text-brand-green font-semibold mt-2">Now</span>
                        <span className="block text-sm sm:text-base font-bold text-gray-900">
                          {formatAmount(toDisplayCurrency(breakdown.totalCHF, displayCurrency, eurRate), displayCurrency)}
                        </span>
                      </div>
                      <div className="text-center z-10 max-w-[30%]">
                        <div className="w-6 h-6 rounded-full bg-brand-yellow-secondary border-2 border-white shadow mx-auto" />
                        <span className="block text-[11px] sm:text-xs text-brand-yellow-secondary font-semibold mt-2">Standard</span>
                        <span className="block text-sm sm:text-base font-bold text-gray-900">
                          ~{formatAmount(toDisplayCurrency(standardEstTotalCHF, displayCurrency, eurRate), displayCurrency)}
                        </span>
                      </div>
                      <div className="text-center z-10 max-w-[30%]">
                        <div className="w-6 h-6 rounded-full bg-brand-red border-2 border-white shadow mx-auto" />
                        <span className="block text-[11px] sm:text-xs text-brand-red font-semibold mt-2">Late Bird</span>
                        <span className="block text-sm sm:text-base font-bold text-gray-900">
                          ~{formatAmount(toDisplayCurrency(lateBirdTotalCHF, displayCurrency, eurRate), displayCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1 mb-4">
                    <p className="font-medium text-gray-700">Includes estimated increases:</p>
                    <p>• Ticket prices increase through pricing stages</p>
                    <p>• Flights typically rise +25–30% closer to the event</p>
                    <p>• Hotels typically rise +20–25% closer to the event</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right column — Breakdown summary */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-28">
                <div ref={breakdownRef} className="bg-black rounded-2xl p-5 sm:p-6 text-white">
                  <h2 className="text-sm font-medium text-brand-gray-light mb-4 sm:mb-5">
                    Estimated breakdown
                  </h2>

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
                      eur={ticketEUR}
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

                    <div className="border-t border-brand-gray-dark pt-3 sm:pt-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium text-brand-gray-light">
                          Estimated total
                        </span>
                        <div className="text-right">
                          <span className="text-xl sm:text-2xl font-bold">
                            {displayCurrency === 'EUR' ? '~' : ''}{formatAmount(totalDisplayAmount, displayCurrency)}
                          </span>
                          {displayCurrency !== 'EUR' && (
                            <span className="block text-xs sm:text-sm text-brand-gray-light mt-0.5">
                              {secondaryCurrencyLabel(breakdown.totalCHF, displayCurrency, eurRate)}
                            </span>
                          )}
                        </div>
                      </div>
                      {standardEstTotalCHF && standardEstTotalCHF > breakdown.totalCHF && (
                        <button
                          onClick={() => document.getElementById('price-evolution')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                          className="cursor-pointer flex items-center gap-1 text-[11px] text-brand-green mt-2 hover:underline"
                        >
                          <Info className="w-3 h-3 shrink-0" />
                          You save {displayCurrency === 'EUR' ? '~' : ''}{formatAmount(toDisplayCurrency(standardEstTotalCHF - breakdown.totalCHF, displayCurrency, eurRate), displayCurrency)} ({Math.round(((standardEstTotalCHF - breakdown.totalCHF) / standardEstTotalCHF) * 100)}%) by booking now
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-brand-gray-medium mt-4">
                    1 CHF ≈ {eurRate} EUR · {rateSource}
                    {rateDate && !isFallback && ` · ${rateDate}`}
                  </p>

                  {/* (Price evolution is below the hotel section outside this card) */}

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

      {/* Sticky mobile total bar */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 lg:hidden bg-black border-t border-brand-gray-dark px-4 py-3 transition-transform duration-300 ${
          breakdownVisible ? 'translate-y-full' : 'translate-y-0'
        }`}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] text-brand-gray-light">Estimated total</span>
            <span className="block text-lg font-bold text-white">
              {displayCurrency === 'EUR' ? '~' : ''}{formatAmount(totalDisplayAmount, displayCurrency)}
            </span>
            {displayCurrency !== 'EUR' && (
              <span className="block text-xs text-brand-gray-medium">
                {secondaryCurrencyLabel(breakdown.totalCHF, displayCurrency, eurRate)}
              </span>
            )}
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={handleGetTickets}
            className="shrink-0"
          >
            Grab a ticket
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </>
  );
}
