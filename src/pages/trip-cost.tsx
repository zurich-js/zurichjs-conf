/**
 * Trip Cost Calculator Page
 *
 * Helps potential attendees estimate the total cost of attending
 * ZurichJS Conf 2026: ticket + travel + hotel.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { SEO, generateBreadcrumbSchema } from '@/components/SEO';
import { NavBar } from '@/components/organisms/NavBar';
import { DynamicSiteFooter } from '@/components/organisms/DynamicSiteFooter';
import { ShapedSection } from '@/components/organisms/ShapedSection';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import { Button } from '@/components/atoms/Button';
import { Heading } from '@/components/atoms/Heading';
import { Kicker } from '@/components/atoms/Kicker';
import { formatAmount, secondaryCurrencyLabel } from '@/components/trip-cost/CalculatorWidgets';
import { CurrencySelector } from '@/components/trip-cost/CurrencySelector';
import { TicketSection } from '@/components/trip-cost/TicketSection';
import { TravelSection } from '@/components/trip-cost/TravelSection';
import { HotelSection } from '@/components/trip-cost/HotelSection';
import { BreakdownCard } from '@/components/trip-cost/BreakdownCard';
import { PriceEvolution } from '@/components/trip-cost/PriceEvolution';
import {
  DEFAULT_TICKET_PRICE_CHF,
  DEFAULT_NIGHTS,
  DEFAULT_CUSTOM_HOTEL_CHF,
  CURRENCY_META,
  getDisplayCurrencyFromCountry,
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
import type { SupportedCurrency } from '@/config/currency';

const DEFAULT_INPUT: TripCostInput = {
  ticketCHF: DEFAULT_TICKET_PRICE_CHF,
  hasTicket: false,
  ticketType: 'standard',
  travelRegion: 'europe',
  travelStep: 0,
  nights: DEFAULT_NIGHTS,
  hotelType: 'hostel',
  customHotelCHF: DEFAULT_CUSTOM_HOTEL_CHF,
  originAirport: null,
  displayCurrency: 'CHF',
  attendanceDays: 'main_only',
};

function toStripeCurrency(dc: DisplayCurrency): SupportedCurrency | null {
  if (dc === 'CHF') return null;
  if (CURRENCY_META[dc].hasNativePricing) return dc as SupportedCurrency;
  return null;
}

export default function TripCostPage() {
  const router = useRouter();
  const [input, setInput] = useState<TripCostInput>(DEFAULT_INPUT);
  const [copied, setCopied] = useState(false);
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const breakdownRef = useRef<HTMLDivElement>(null);
  const trackedView = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { rates, rateDate, rateSource, isLoading: ratesLoading, isError: ratesError } = useExchangeRate();
  const { countryCode } = useCurrency();

  const chfQuery = useQuery(createTicketPricingQueryOptions('CHF'));
  const chfPlans = useMemo(() => chfQuery.data?.plans ?? [], [chfQuery.data?.plans]);
  const stageDisplayName = chfQuery.data?.stageDisplayName ?? null;
  const ticketLoading = chfQuery.isLoading;

  const displayCurrency: DisplayCurrency = input.displayCurrency ?? 'CHF';
  const nativeStripeCurrency = toStripeCurrency(displayCurrency);
  const nativeQuery = useQuery({
    ...createTicketPricingQueryOptions(nativeStripeCurrency ?? 'CHF'),
    enabled: nativeStripeCurrency !== null,
  });
  const nativePlans = nativeStripeCurrency ? (nativeQuery.data?.plans ?? []) : [];

  const findPriceCHF = (planId: string) => {
    const plan = chfPlans.find((p) => p.id === planId);
    return plan ? Math.round(plan.price / 100) : 0;
  };
  const standardPriceCHF = findPriceCHF('standard') || DEFAULT_TICKET_PRICE_CHF;
  const studentPriceCHF = findPriceCHF('standard_student_unemployed') || DEFAULT_TICKET_PRICE_CHF;
  const vipPriceCHF = findPriceCHF('vip');

  const findPriceNative = (planId: string) => {
    const plan = nativePlans.find((p) => p.id === planId);
    return plan ? Math.round(plan.price / 100) : undefined;
  };
  const getTicketNative = () => {
    if (input.hasTicket) return 0;
    if (!nativeStripeCurrency) return undefined;
    const planId = input.ticketType === 'student' ? 'standard_student_unemployed' : input.ticketType;
    return findPriceNative(planId ?? 'standard');
  };
  const ticketNative = getTicketNative();

  const needsRates = displayCurrency !== 'CHF';

  // Apply Stripe price on mount
  const appliedInitial = useRef(false);
  useEffect(() => {
    if (appliedInitial.current || ticketLoading || chfPlans.length === 0) return;
    appliedInitial.current = true;
    setInput((prev) => {
      if (prev.ticketCHF === DEFAULT_TICKET_PRICE_CHF && prev.ticketType === 'standard') {
        return { ...prev, ticketCHF: standardPriceCHF };
      }
      return prev;
    });
  }, [ticketLoading, chfPlans, standardPriceCHF]);

  // Set display currency from detected country
  const appliedGeoCurrency = useRef(false);
  useEffect(() => {
    if (appliedGeoCurrency.current || !countryCode) return;
    appliedGeoCurrency.current = true;
    const geoCurrency = getDisplayCurrencyFromCountry(countryCode);
    setInput((prev) => {
      if (prev.displayCurrency && prev.displayCurrency !== 'CHF') return prev;
      return { ...prev, displayCurrency: geoCurrency };
    });
  }, [countryCode]);

  useEffect(() => {
    if (!router.isReady) return;
    const params = new URLSearchParams(window.location.search);
    if (params.toString()) {
      setInput((prev) => ({ ...prev, ...decodeFromSearchParams(params) }));
    }
  }, [router.isReady]);

  useEffect(() => {
    if (trackedView.current) return;
    trackedView.current = true;
    try { analytics.track('page_viewed', { page_path: '/trip-cost', page_name: 'Trip Cost Calculator', page_category: 'other' } as never); } catch { /* OK */ }
  }, []);

  useEffect(() => {
    const el = breakdownRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setBreakdownVisible(entry.isIntersecting), { threshold: 0.1 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const trackUpdate = useCallback((next: TripCostInput) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const bd = computeTripCost(next);
      try { analytics.track('button_clicked', { button_name: 'trip_cost_updated', button_location: 'trip_cost_calculator', button_variant: next.travelRegion, destination_url: undefined } as never); } catch { /* OK */ }
      try { analytics.getInstance().capture('trip_cost_updated', { region: next.travelRegion, nights: next.nights, hotel_type: next.hotelType, ticket_type: next.ticketType, total_bucket: getTotalBucket(bd.totalCHF), currency: next.displayCurrency }); } catch { /* OK */ }
    }, 800);
  }, []);

  const update = useCallback(
    (partial: Partial<TripCostInput>) => {
      setInput((prev) => {
        const next = { ...prev, ...partial };
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

  const handleTicketType = useCallback(
    (type: TicketType) => {
      const partial: Partial<TripCostInput> = { ticketType: type };
      if (type === 'have_ticket') { partial.hasTicket = true; partial.ticketCHF = 0; }
      else { partial.hasTicket = false; partial.ticketCHF = type === 'vip' ? vipPriceCHF : type === 'student' ? studentPriceCHF : standardPriceCHF; }
      update(partial);
    },
    [update, standardPriceCHF, studentPriceCHF, vipPriceCHF]
  );

  const breakdown = computeTripCost(input);
  const ticketType = input.ticketType ?? 'standard';
  const rate = rates[displayCurrency];
  const isConverted = displayCurrency !== 'CHF';

  // Compute display totals
  const computeDisplayTotal = (): number | null => {
    if (displayCurrency === 'CHF') return breakdown.totalCHF;
    if (!rate) return null;
    return (ticketNative ?? Math.round(breakdown.ticketCHF * rate)) + Math.round(breakdown.travelCHF * rate) + Math.round(breakdown.hotelTotalCHF * rate);
  };
  const totalDisplayAmount = computeDisplayTotal();

  // Price evolution calculations
  const isStudentOrHaveTicket = ticketType === 'student' || ticketType === 'have_ticket';
  const lateBirdTicketCHF = (() => {
    if (isStudentOrHaveTicket) return breakdown.ticketCHF;
    const plan = chfPlans.find((p) => p.id === ticketType);
    return plan?.comparePrice ? Math.round(plan.comparePrice / 100) : null;
  })();
  const lateBirdTicketNative = (() => {
    if (isStudentOrHaveTicket) return ticketNative;
    if (!nativeStripeCurrency) return undefined;
    const plan = nativePlans.find((p) => p.id === ticketType);
    return plan?.comparePrice ? Math.round(plan.comparePrice / 100) : undefined;
  })();
  const midTicketCHF = lateBirdTicketCHF !== null
    ? (isStudentOrHaveTicket ? breakdown.ticketCHF : Math.round(breakdown.ticketCHF + (lateBirdTicketCHF - breakdown.ticketCHF) * 0.4))
    : null;
  const midTicketNative = (midTicketCHF !== null && ticketNative !== undefined && lateBirdTicketNative !== undefined)
    ? (isStudentOrHaveTicket ? ticketNative : Math.round(ticketNative + (lateBirdTicketNative - ticketNative) * 0.4))
    : undefined;

  const computeEvolution = (tNative: number | undefined, tCHF: number, tMul: number, hMul: number): number | null => {
    if (displayCurrency === 'CHF') return Math.round(tCHF + breakdown.travelCHF * tMul + breakdown.hotelTotalCHF * hMul);
    if (!rate) return null;
    return (tNative ?? Math.round(tCHF * rate)) + Math.round(breakdown.travelCHF * tMul * rate) + Math.round(breakdown.hotelTotalCHF * hMul * rate);
  };
  const standardEstDisplayAmount = midTicketCHF !== null ? computeEvolution(midTicketNative, midTicketCHF, 1.25, 1.20) : null;
  const lateBirdDisplayAmount = lateBirdTicketCHF !== null ? computeEvolution(lateBirdTicketNative, lateBirdTicketCHF, 1.30, 1.25) : null;

  const handleShare = useCallback(async () => {
    const params = encodeToSearchParams(input);
    const url = `${window.location.origin}/trip-cost?${params.toString()}`;
    window.history.replaceState(null, '', `/trip-cost?${params.toString()}`);
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { prompt('Copy this link:', url); }
    try { analytics.getInstance().capture('trip_cost_cta_clicked', { action: 'share' }); } catch { /* OK */ }
  }, [input]);

  const handleGetTickets = () => {
    try { analytics.getInstance().capture('trip_cost_cta_clicked', { action: 'get_tickets' }); } catch { /* OK */ }
    router.push('/#tickets');
  };

  const showEvolution = lateBirdDisplayAmount !== null && standardEstDisplayAmount !== null && totalDisplayAmount !== null;

  return (
    <>
      <SEO
        title="Trip Cost Calculator — Estimate Your Total Cost"
        description="Estimate the total cost of attending ZurichJS Conf 2026: ticket, travel, and hotel. Plan your budget in under 30 seconds."
        canonical="/trip-cost"
        keywords="zurichjs cost, javascript conference cost, zurich travel cost, conference budget planner"
        jsonLd={[generateBreadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Trip Cost Calculator', url: '/trip-cost' }])]}
      />
      <NavBar />

      <main className="min-h-screen bg-white pt-24 pb-36 md:pt-36 lg:pb-40">
        <SectionContainer>
          <div className="max-w-3xl mb-8 md:mb-16">
            <Kicker variant="light">Trip Cost Calculator</Kicker>
            <Heading level="h1" className="mt-3 mb-3 md:mb-4">How much does ZurichJS Conf cost in total?</Heading>
            <p className="text-base md:text-lg text-gray-600 leading-relaxed">
              Estimate ticket + travel + hotel in under 30 seconds. All prices are estimates — your actual costs may vary.
            </p>
            <div className="text-sm text-gray-500 mt-3 space-y-2">
              <p>We know that travelling to Switzerland can seem costly at first, but with early booking, attending ZurichJS can be more accessible than you might think.</p>
              <p>Our goal is to make the conference open to everyone who wants to be part of it, and financial barriers shouldn&apos;t prevent anyone from joining the community.</p>
              <p>If you need support or have questions while planning your trip, don&apos;t hesitate to{' '}
                <a href="mailto:hello@zurichjs.com" className="underline hover:text-gray-700 transition-colors">contact us</a>, we&apos;re sure we can work something out together.</p>
              <p>For more details on travelling and airport options, please visit our{' '}
                <Link href="/faq" className="underline hover:text-gray-700 transition-colors">FAQ page</Link>.</p>
            </div>
            <div className="flex justify-center mt-6">
              <CurrencySelector value={displayCurrency} onChange={(c) => update({ displayCurrency: c })} detectedCountryCode={countryCode} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12">
            <div className="lg:col-span-3 space-y-6 md:space-y-8">
              <TicketSection ticketType={ticketType} chfPlans={chfPlans} nativePlans={nativePlans} displayCurrency={displayCurrency} rates={rates} stageDisplayName={stageDisplayName} isLoading={ticketLoading} onSelect={handleTicketType} />
              <TravelSection travelRegion={input.travelRegion} travelStep={input.travelStep} originAirport={input.originAirport ?? null} currency={displayCurrency} rates={rates} onUpdate={update} />
              <HotelSection nights={input.nights} hotelType={input.hotelType} customHotelCHF={input.customHotelCHF} currency={displayCurrency} rates={rates} attendanceDays={input.attendanceDays ?? 'main_only'} onUpdate={update} />

              {showEvolution && (
                <PriceEvolution totalDisplayAmount={totalDisplayAmount} standardEstDisplayAmount={standardEstDisplayAmount} lateBirdDisplayAmount={lateBirdDisplayAmount} displayCurrency={displayCurrency} isConverted={isConverted} />
              )}
            </div>

            <div className="lg:col-span-2">
              <BreakdownCard
                breakdown={breakdown} ticketType={ticketType} travelRegion={input.travelRegion} displayCurrency={displayCurrency} rates={rates} ticketNative={ticketNative} totalDisplayAmount={totalDisplayAmount} lateBirdDisplayAmount={lateBirdDisplayAmount}
                rateDate={rateDate} rateSource={rateSource} needsRates={needsRates} ratesLoading={ratesLoading} ratesError={ratesError} copied={copied} breakdownRef={breakdownRef} onShare={handleShare} onGetTickets={handleGetTickets}
              />
            </div>
          </div>
        </SectionContainer>
      </main>

      <ShapedSection shape="tighten" variant="dark" dropBottom><DynamicSiteFooter /></ShapedSection>

      {/* Sticky mobile total bar */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 lg:hidden bg-black border-t border-brand-gray-dark px-4 py-3 transition-transform duration-300 ${breakdownVisible ? 'translate-y-full' : 'translate-y-0'}`}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] text-brand-gray-light">Estimated total</span>
            <span className="block text-lg font-bold text-white">
              {totalDisplayAmount !== null ? `${isConverted ? '~' : ''}${formatAmount(totalDisplayAmount, displayCurrency)}` : formatAmount(breakdown.totalCHF, 'CHF')}
            </span>
            {isConverted && <span className="block text-xs text-brand-gray-medium">{secondaryCurrencyLabel(breakdown.totalCHF, displayCurrency)}</span>}
          </div>
          <Button variant="primary" size="md" onClick={handleGetTickets} className="shrink-0">
            Grab a ticket<ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </>
  );
}
