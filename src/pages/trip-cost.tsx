/**
 * Trip Cost Calculator Page
 *
 * Helps potential attendees estimate the total cost of attending
 * ZurichJS Conf 2026: ticket + travel + hotel.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { Ticket, Share2, Check, ArrowRight } from 'lucide-react';
import { SEO, generateBreadcrumbSchema } from '@/components/SEO';
import { NavBar } from '@/components/organisms/NavBar';
import { DynamicSiteFooter } from '@/components/organisms/DynamicSiteFooter';
import { ShapedSection } from '@/components/organisms/ShapedSection';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import { Button } from '@/components/atoms/Button';
import { Heading } from '@/components/atoms/Heading';
import { Kicker } from '@/components/atoms/Kicker';
import { Input } from '@/components/atoms/Input';
import {
  CalculatorSection,
  BreakdownRow,
  SpendLessTips,
  formatAmount,
  toDisplayCurrency,
  secondaryCurrencyLabel,
} from '@/components/trip-cost/CalculatorWidgets';
import { TravelSection } from '@/components/trip-cost/TravelSection';
import { HotelSection } from '@/components/trip-cost/HotelSection';
import {
  DEFAULT_TICKET_PRICE_CHF,
  TRAVEL_RANGES,
  DEFAULT_NIGHTS,
  DEFAULT_CUSTOM_HOTEL_CHF,
  type DisplayCurrency,
} from '@/config/trip-cost';
import {
  computeTripCost,
  encodeToSearchParams,
  decodeFromSearchParams,
  getTotalBucket,
  type TripCostInput,
} from '@/lib/trip-cost/calculations';
import { useExchangeRate } from '@/lib/trip-cost/use-exchange-rate';
import { useTicketPricing } from '@/hooks/useTicketPricing';
import { useCurrency } from '@/contexts/CurrencyContext';
import { analytics } from '@/lib/analytics/client';

/** Default form state */
const DEFAULT_INPUT: TripCostInput = {
  ticketCHF: DEFAULT_TICKET_PRICE_CHF,
  hasTicket: false,
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

  // Live exchange rate from Frankfurter API (ECB data)
  const { eurRate, rateDate, rateSource, isFallback } = useExchangeRate();

  // Current ticket pricing from Stripe
  const { plans, stageDisplayName, isLoading: ticketLoading } = useTicketPricing();

  // Auto-detected currency from geo-IP
  const { currency: detectedCurrency } = useCurrency();

  // Resolve display currency
  const displayCurrency: DisplayCurrency =
    input.displayCurrency ?? (detectedCurrency === 'EUR' ? 'EUR' : 'CHF');

  // Set initial ticket price from Stripe when available
  const appliedStripePrice = useRef(false);
  useEffect(() => {
    if (appliedStripePrice.current || ticketLoading || plans.length === 0) return;
    appliedStripePrice.current = true;
    const standard = plans.find((p) => p.lookupKey?.includes('standard'));
    const cheapest = standard ?? plans[0];
    if (cheapest?.price && cheapest.currency?.toUpperCase() === 'CHF') {
      const priceCHF = Math.round(cheapest.price / 100);
      setInput((prev) => {
        // Only apply if user hasn't manually changed it or URL didn't specify it
        if (prev.ticketCHF === DEFAULT_TICKET_PRICE_CHF) {
          return { ...prev, ticketCHF: priceCHF };
        }
        return prev;
      });
    }
  }, [ticketLoading, plans]);

  // Set initial currency from geo-detection
  useEffect(() => {
    if (detectedCurrency === 'EUR') {
      setInput((prev) => {
        if (!prev.displayCurrency) return { ...prev, displayCurrency: 'EUR' };
        return prev;
      });
    }
  }, [detectedCurrency]);

  // Hydrate from query params on mount
  useEffect(() => {
    if (!router.isReady) return;
    const params = new URLSearchParams(window.location.search);
    if (params.toString()) {
      const decoded = decodeFromSearchParams(params);
      setInput((prev) => ({ ...prev, ...decoded }));
    }
  }, [router.isReady]);

  // Track page view once
  useEffect(() => {
    if (trackedView.current) return;
    trackedView.current = true;
    try {
      analytics.track('page_viewed', {
        page_path: '/trip-cost',
        page_name: 'Trip Cost Calculator',
        page_category: 'other',
      } as never);
    } catch {
      // Analytics may not be initialized
    }
  }, []);

  // Debounced analytics for input changes
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

  // Compute breakdown
  const breakdown = useMemo(() => computeTripCost(input, eurRate), [input, eurRate]);

  // Share URL
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

  const ticketLabel = stageDisplayName ? `${stageDisplayName} ticket` : 'Ticket';

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

      <main className="min-h-screen bg-white pt-28 pb-16 md:pt-36 md:pb-24">
        <SectionContainer>
          {/* Page header + currency toggle */}
          <div className="max-w-3xl mb-12 md:mb-16">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Kicker variant="light">Trip Cost Calculator</Kicker>
                <Heading level="h1" className="mt-3 mb-4">
                  How much does ZurichJS Conf cost in total?
                </Heading>
              </div>
              {/* Currency toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5 shrink-0 mt-2">
                {(['CHF', 'EUR'] as DisplayCurrency[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => update({ displayCurrency: c })}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      displayCurrency === c
                        ? 'bg-white text-black shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    aria-pressed={displayCurrency === c}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-lg text-gray-600 leading-relaxed">
              Estimate ticket + travel + hotel in under 30 seconds.
              All prices are estimates — your actual costs may vary.
            </p>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Left column — Inputs */}
            <div className="lg:col-span-3 space-y-8">
              {/* A) Ticket */}
              <CalculatorSection icon={<Ticket className="w-5 h-5" />} title="Ticket">
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <button
                      role="switch"
                      aria-checked={input.hasTicket}
                      onClick={() => update({ hasTicket: !input.hasTicket })}
                      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${
                        input.hasTicket ? 'bg-brand-yellow-main' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                          input.hasTicket ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-gray-700">I already have a ticket</span>
                  </label>

                  {!input.hasTicket && (
                    <div>
                      <label
                        htmlFor="ticket-price"
                        className="block text-xs font-medium text-gray-500 mb-1.5"
                      >
                        Ticket price (CHF)
                      </label>
                      <Input
                        id="ticket-price"
                        name="ticket-price"
                        type="number"
                        min={0}
                        value={input.ticketCHF}
                        onChange={(e) =>
                          update({ ticketCHF: parseInt(e.target.value, 10) || 0 })
                        }
                        className="!bg-white !text-black border border-gray-300 max-w-[180px]"
                        aria-label="Ticket price in CHF"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        {ticketLoading
                          ? 'Loading current price...'
                          : `${ticketLabel} · CHF ${input.ticketCHF}`}
                      </p>
                    </div>
                  )}
                </div>
              </CalculatorSection>

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
                      label={input.hasTicket ? 'Ticket (already have)' : 'Ticket'}
                      chf={breakdown.ticketCHF}
                      dimmed={input.hasTicket}
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
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-brand-gray-light hover:text-white border border-brand-gray-dark hover:border-brand-gray-medium transition-colors"
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
