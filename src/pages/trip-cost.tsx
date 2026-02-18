/**
 * Trip Cost Calculator Page
 *
 * Helps potential attendees estimate the total cost of attending
 * ZurichJS Conf 2026: ticket + travel + hotel.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import {
  Plane,
  Hotel,
  Ticket,
  ExternalLink,
  Share2,
  Check,
  Minus,
  Plus,
  Info,
  ArrowRight,
} from 'lucide-react';
import { SEO, generateBreadcrumbSchema } from '@/components/SEO';
import { NavBar } from '@/components/organisms/NavBar';
import { DynamicSiteFooter } from '@/components/organisms/DynamicSiteFooter';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import { Button } from '@/components/atoms/Button';
import { Heading } from '@/components/atoms/Heading';
import { Kicker } from '@/components/atoms/Kicker';
import { Input } from '@/components/atoms/Input';
import { CalculatorSection, BreakdownRow, SpendLessTips, formatNumber } from '@/components/trip-cost/CalculatorWidgets';
import {
  DEFAULT_TICKET_PRICE_CHF,
  EUR_TO_CHF_RATE,
  TRAVEL_RANGES,
  TRAVEL_STEPS,
  HOTEL_OPTIONS,
  DEFAULT_NIGHTS,
  MIN_NIGHTS,
  MAX_NIGHTS,
  DEFAULT_CUSTOM_HOTEL_CHF,
  type TravelRegion,
} from '@/config/trip-cost';
import {
  computeTripCost,
  encodeToSearchParams,
  decodeFromSearchParams,
  getTotalBucket,
  type TripCostInput,
} from '@/lib/trip-cost/calculations';
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
};

export default function TripCostPage() {
  const router = useRouter();
  const [input, setInput] = useState<TripCostInput>(DEFAULT_INPUT);
  const [copied, setCopied] = useState(false);
  const trackedView = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const trackUpdate = useCallback(
    (next: TripCostInput) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const breakdown = computeTripCost(next);
        try {
          analytics.track('button_clicked', {
            button_name: 'trip_cost_updated',
            button_location: 'trip_cost_calculator',
            button_variant: next.travelRegion,
            destination_url: undefined,
          } as never);
        } catch {
          // Analytics may not be initialized
        }
        // Also capture as a posthog event directly
        try {
          const ph = analytics.getInstance();
          ph.capture('trip_cost_updated', {
            region: next.travelRegion,
            nights: next.nights,
            hotel_type: next.hotelType,
            total_bucket: getTotalBucket(breakdown.totalCHF),
          });
        } catch {
          // OK if PostHog not ready
        }
      }, 800);
    },
    []
  );

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
  const breakdown = useMemo(() => computeTripCost(input), [input]);

  // Share URL
  const handleShare = useCallback(async () => {
    const params = encodeToSearchParams(input);
    const url = `${window.location.origin}/trip-cost?${params.toString()}`;

    // Update URL without reload
    window.history.replaceState(null, '', `/trip-cost?${params.toString()}`);

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
      prompt('Copy this link:', url);
    }

    try {
      const ph = analytics.getInstance();
      ph.capture('trip_cost_cta_clicked', { action: 'share' });
    } catch {
      // OK
    }
  }, [input]);

  const handleGetTickets = () => {
    try {
      const ph = analytics.getInstance();
      ph.capture('trip_cost_cta_clicked', { action: 'get_tickets' });
    } catch {
      // OK
    }
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

      <main className="min-h-screen bg-white pt-28 pb-16 md:pt-36 md:pb-24">
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
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Left column — Inputs */}
            <div className="lg:col-span-3 space-y-8">
              {/* A) Ticket */}
              <CalculatorSection
                icon={<Ticket className="w-5 h-5" />}
                title="Ticket"
              >
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
                        Early bird standard ticket starts at CHF {DEFAULT_TICKET_PRICE_CHF}
                      </p>
                    </div>
                  )}
                </div>
              </CalculatorSection>

              {/* B) Travel */}
              <CalculatorSection
                icon={<Plane className="w-5 h-5" />}
                title="Travel"
              >
                <div className="space-y-4">
                  {/* Region selector */}
                  <div className="flex gap-2">
                    {(['europe', 'international'] as TravelRegion[]).map((region) => (
                      <button
                        key={region}
                        onClick={() => update({ travelRegion: region })}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          input.travelRegion === region
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        aria-pressed={input.travelRegion === region}
                      >
                        {TRAVEL_RANGES[region].label}
                      </button>
                    ))}
                  </div>

                  {/* Travel cost step */}
                  <div>
                    <label
                      htmlFor="travel-range"
                      className="block text-xs font-medium text-gray-500 mb-2"
                    >
                      Estimated round-trip cost
                    </label>
                    <div className="flex gap-2">
                      {TRAVEL_STEPS.map((step, idx) => {
                        const range = TRAVEL_RANGES[input.travelRegion];
                        const chf = range[step.key];
                        return (
                          <button
                            key={step.key}
                            onClick={() => update({ travelStep: idx })}
                            className={`flex-1 px-3 py-3 rounded-lg text-center transition-colors border ${
                              input.travelStep === idx
                                ? 'border-black bg-black text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                            aria-pressed={input.travelStep === idx}
                          >
                            <span className="block text-xs font-medium opacity-70">
                              {step.label}
                            </span>
                            <span className="block text-sm font-bold mt-0.5">
                              CHF {chf}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="flex items-start gap-1.5 text-xs text-gray-400">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    This is an estimate. Prices vary by season, airport, and booking time.
                  </p>
                </div>
              </CalculatorSection>

              {/* C) Hotel */}
              <CalculatorSection
                icon={<Hotel className="w-5 h-5" />}
                title="Hotel"
              >
                <div className="space-y-4">
                  {/* Nights stepper */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Number of nights
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          update({ nights: Math.max(MIN_NIGHTS, input.nights - 1) })
                        }
                        disabled={input.nights <= MIN_NIGHTS}
                        className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Decrease nights"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-lg font-bold w-8 text-center" aria-live="polite">
                        {input.nights}
                      </span>
                      <button
                        onClick={() =>
                          update({ nights: Math.min(MAX_NIGHTS, input.nights + 1) })
                        }
                        disabled={input.nights >= MAX_NIGHTS}
                        className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Increase nights"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-500">
                        night{input.nights !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Hotel type selector */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">
                      Where to stay
                    </label>
                    <div className="space-y-2">
                      {HOTEL_OPTIONS.map((hotel) => (
                        <button
                          key={hotel.id}
                          onClick={() => update({ hotelType: hotel.id })}
                          className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                            input.hotelType === hotel.id
                              ? 'border-black bg-gray-50'
                              : 'border-gray-200 bg-white hover:border-gray-400'
                          }`}
                          aria-pressed={input.hotelType === hotel.id}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {hotel.label}
                              </span>
                              <span className="text-xs text-gray-500 ml-2">
                                {hotel.sublabel}
                              </span>
                            </div>
                            {hotel.id !== 'other' && (
                              <span className="text-xs text-gray-500">
                                ~CHF {hotel.estimatePerNightCHF}/night
                              </span>
                            )}
                          </div>
                          {hotel.url && input.hotelType === hotel.id && (
                            <a
                              href={hotel.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline mt-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Visit website
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom hotel price */}
                  {input.hotelType === 'other' && (
                    <div>
                      <label
                        htmlFor="custom-hotel"
                        className="block text-xs font-medium text-gray-500 mb-1.5"
                      >
                        Price per night (CHF)
                      </label>
                      <Input
                        id="custom-hotel"
                        name="custom-hotel"
                        type="number"
                        min={0}
                        value={input.customHotelCHF}
                        onChange={(e) =>
                          update({
                            customHotelCHF: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="!bg-white !text-black border border-gray-300 max-w-[180px]"
                        aria-label="Custom hotel price per night in CHF"
                      />
                    </div>
                  )}

                  <p className="flex items-start gap-1.5 text-xs text-gray-400">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    Hotel prices are estimates and may vary by dates and availability.
                  </p>
                </div>
              </CalculatorSection>
            </div>

            {/* Right column — Breakdown summary */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-28">
                {/* Breakdown card */}
                <div className="bg-black rounded-2xl p-6 text-white">
                  <h2 className="text-sm font-medium text-brand-gray-light mb-5">
                    Estimated breakdown
                  </h2>

                  <div className="space-y-4">
                    <BreakdownRow
                      label={input.hasTicket ? 'Ticket (already have)' : 'Ticket'}
                      chf={breakdown.ticketCHF}
                      dimmed={input.hasTicket}
                    />
                    <BreakdownRow
                      label={`Travel (${TRAVEL_RANGES[input.travelRegion].label.toLowerCase()})`}
                      chf={breakdown.travelCHF}
                      eur={breakdown.travelEUR}
                    />
                    <BreakdownRow
                      label={`Hotel (${breakdown.nights} night${breakdown.nights !== 1 ? 's' : ''})`}
                      chf={breakdown.hotelTotalCHF}
                      sublabel={
                        breakdown.hotelPerNightCHF > 0
                          ? `CHF ${breakdown.hotelPerNightCHF} × ${breakdown.nights}`
                          : undefined
                      }
                    />

                    <div className="border-t border-brand-gray-dark pt-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium text-brand-gray-light">
                          Estimated total
                        </span>
                        <div className="text-right">
                          <span className="text-2xl font-bold">
                            CHF {formatNumber(breakdown.totalCHF)}
                          </span>
                          <span className="block text-sm text-brand-gray-light mt-0.5">
                            ~EUR {formatNumber(breakdown.totalEUR)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-brand-gray-medium mt-4">
                    Conversion rate used: 1 CHF ≈ {EUR_TO_CHF_RATE} EUR (estimate)
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

      <DynamicSiteFooter />
    </>
  );
}

