/**
 * Public Sponsor Quote Page
 *
 * Client-facing read-only view of a sponsor quote.
 * Reads quote state from the `?q=` URL parameter (LZ-string compressed JSON).
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Lock, Star, Check, Package, Wallet } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { NavBar } from '@/components/organisms/NavBar';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import { Button } from '@/components/atoms/Button';
import { Heading } from '@/components/atoms/Heading';
import { Kicker } from '@/components/atoms/Kicker';
import { SiteFooter, ShapedSection } from '@/components/organisms';
import { analytics } from '@/lib/analytics/client';
import type { SponsorQuoteState, SponsorQuoteBreakdown, SponsorQuoteOptionBreakdown } from '@/lib/types/sponsor-quote';
import type { SponsorQuoteCurrency } from '@/lib/types/sponsor-quote';
import {
  decodeSponsorQuoteFromUrl,
  computeSponsorQuoteBreakdown,
  formatQuoteAmount,
} from '@/lib/sponsor/quote-calculations';
import { convertCHFToCurrency } from '@/lib/sponsor/quote-catalog';
import { useExchangeRate } from '@/lib/trip-cost/use-exchange-rate';
import type { ExchangeRates } from '@/lib/trip-cost/use-exchange-rate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getQuoteFromUrl(): SponsorQuoteState | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (!q) return null;
  return decodeSponsorQuoteFromUrl(q);
}

function formatValidityDate(isoDate: string): string {
  try {
    const date = new Date(isoDate + 'T00:00:00');
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

// ---------------------------------------------------------------------------
// Currency display helpers — CHF primary with converted estimate in brackets
// ---------------------------------------------------------------------------

function fmtChf(cents: number): string {
  return formatQuoteAmount(cents, 'CHF');
}

function fmtWithEstimate(
  chfCents: number,
  currency: SponsorQuoteCurrency,
  rates: ExchangeRates | undefined,
): { chf: string; estimate: string | null } {
  const chf = fmtChf(chfCents);
  if (currency === 'CHF' || !rates || !rates[currency]) return { chf, estimate: null };
  const converted = convertCHFToCurrency(chfCents, currency, rates);
  return { chf, estimate: `~ ${formatQuoteAmount(converted, currency)}` };
}

// ---------------------------------------------------------------------------
// Line Row
// ---------------------------------------------------------------------------

function LineRow({
  label, unitLabel, discount, originalAmount, amount,
  currency, rates, exclusive, exclusivityPremium, includedInTier, forgone,
}: {
  label: string; unitLabel?: string; discount?: string; originalAmount?: number;
  amount: number; currency: SponsorQuoteCurrency; rates?: ExchangeRates;
  exclusive?: boolean; exclusivityPremium?: number; includedInTier?: boolean; forgone?: boolean;
}) {
  const { chf, estimate } = fmtWithEstimate(amount, currency, rates);
  return (
    <div className="space-y-0.5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {exclusive && <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            <span className="text-sm text-gray-800">{label}</span>
            {exclusive && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
                Exclusive
              </span>
            )}
          </div>
          {unitLabel && (
            <span className="block text-xs text-gray-500">
              {unitLabel}
              {discount && <span className="text-green-600 ml-1">({discount})</span>}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          {forgone ? (
            <span className="text-sm font-medium text-orange-500 line-through">Forgone</span>
          ) : includedInTier ? (
            <span className="text-sm font-medium text-green-600">Included</span>
          ) : (
            <>
              {originalAmount !== undefined && (
                <span className="block text-xs text-gray-400 line-through">{fmtChf(originalAmount)}</span>
              )}
              <span className="text-sm font-medium text-gray-900">{chf}</span>
              {estimate && <span className="block text-xs text-gray-400">({estimate})</span>}
            </>
          )}
        </div>
      </div>
      {exclusive && exclusivityPremium !== undefined && exclusivityPremium > 0 && (
        <div className="ml-5 text-xs text-amber-600">
          + Exclusivity premium: {fmtChf(exclusivityPremium)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Option Card
// ---------------------------------------------------------------------------

function OptionCard({
  opt, index, isRecommended, currency, rates, totalOptions, highlights,
}: {
  opt: SponsorQuoteOptionBreakdown; index: number; isRecommended: boolean;
  currency: SponsorQuoteCurrency; rates?: ExchangeRates; totalOptions: number; highlights: string[];
}) {
  const est = (chfCents: number) => fmtWithEstimate(chfCents, currency, rates);
  const categories = [...new Set(opt.items.map((i) => i.category))];
  const filteredHighlights = highlights.filter(Boolean);

  return (
    <div className={`border rounded-2xl overflow-hidden ${isRecommended ? 'border-2 border-brand-primary' : 'border-gray-200'}`}>
      {/* Header */}
      <div className={`px-5 sm:px-6 py-4 ${isRecommended ? 'bg-brand-primary/10' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            {totalOptions > 1 && (
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Option {index + 1}
              </span>
            )}
            <h3 className="text-lg font-bold text-gray-900">
              {opt.title || `Option ${index + 1}`}
            </h3>
          </div>
          {isRecommended && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-primary text-black text-xs font-semibold">
              <Star className="w-3.5 h-3.5 fill-current" /> Recommended
            </span>
          )}
        </div>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-5">
        {/* Exclusive items callout */}
        {opt.exclusiveItemLabels.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">Exclusive Rights Included</span>
            </div>
            <p className="text-sm text-amber-700">
              This package grants exclusive rights to: {opt.exclusiveItemLabels.join(', ')}.
            </p>
          </div>
        )}

        {/* Items grouped by category */}
        {categories.map((category) => {
          const categoryItems = opt.items.filter((i) => i.category === category);
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-gray-400" />
                <h4 className="text-sm font-semibold text-gray-700">{category}</h4>
              </div>
              <div className="space-y-2">
                {categoryItems.map((item) => {
                  const kept = item.includedInTier ? item.quantity - item.forgoneQty : item.quantity;
                  const isFullyForgone = item.includedInTier && item.forgoneQty >= item.quantity;
                  const isPartiallyForgone = item.includedInTier && item.forgoneQty > 0 && !isFullyForgone;
                  return (
                    <div key={item.id}>
                      <LineRow
                        label={kept > 1 ? `${kept}× ${item.label}` : item.label}
                        unitLabel={!item.includedInTier && item.quantity > 1 ? `${fmtChf(item.unitPriceCents)} each` : undefined}
                        discount={!item.includedInTier && item.discountPercent > 0 ? `${item.discountPercent}% off` : undefined}
                        originalAmount={!item.includedInTier && item.discountCents > 0 ? item.subtotalCents : undefined}
                        amount={item.netCents}
                        currency={currency}
                        rates={rates}
                        exclusive={item.exclusive}
                        exclusivityPremium={item.exclusivityPremiumCents}
                        includedInTier={item.includedInTier}
                        forgone={isFullyForgone}
                      />
                      {isPartiallyForgone && (
                        <div className="ml-5 mt-1 text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                          {item.forgoneQty} of {item.quantity} forgone → {fmtChf(item.forgoneCreditCents)} converted to add-on credit
                        </div>
                      )}
                      {isFullyForgone && item.forgoneCreditCents > 0 && (
                        <div className="ml-5 mt-1 text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                          All {item.quantity} forgone → {fmtChf(item.forgoneCreditCents)} converted to add-on credit
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Custom discounts */}
        {opt.customDiscounts.length > 0 && (
          <div className="space-y-1.5">
            {opt.customDiscounts.map((d) => (
              <div key={d.id} className="flex items-baseline justify-between">
                <span className="text-sm text-green-600">{d.label || 'Discount'}</span>
                <div className="text-right">
                  <span className="text-sm font-medium text-green-600">-{fmtChf(d.amountCents)}</span>
                  {est(d.amountCents).estimate && <span className="block text-xs text-gray-400">(-{est(d.amountCents).estimate})</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add-on Budget Summary */}
        {opt.addOnBudgetCents > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Wallet className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">Add-on Budget</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Base budget</span>
                <span className="font-medium text-blue-900">{fmtChf(opt.addOnBudgetCents)}</span>
              </div>
              {opt.totalForgoneCents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-orange-600">+ Forgone credits</span>
                  <span className="font-medium text-orange-600">+{fmtChf(opt.totalForgoneCents)}</span>
                </div>
              )}
              {opt.totalForgoneCents > 0 && (
                <div className="flex justify-between text-sm border-t border-blue-200 pt-1">
                  <span className="text-blue-800 font-medium">Effective budget</span>
                  <span className="font-semibold text-blue-900">{fmtChf(opt.effectiveBudgetCents)}</span>
                </div>
              )}
              {opt.addOnSpentCents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-blue-700">Allocated</span>
                  <span className="font-medium text-blue-900">{fmtChf(opt.addOnSpentCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-blue-700">Remaining</span>
                <span className={`font-medium ${opt.addOnRemainingCents < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {fmtChf(opt.addOnRemainingCents)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          {opt.totalDiscountCents > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-500">Original price</span>
              <span className="text-sm text-gray-400 line-through">{fmtChf(opt.subtotalCents)}</span>
            </div>
          )}
          {opt.totalDiscountCents > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-green-600 font-medium">Total savings</span>
              <span className="text-sm font-semibold text-green-600">-{fmtChf(opt.totalDiscountCents)}</span>
            </div>
          )}
          {opt.totalExclusivityCents > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-amber-600 font-medium">Exclusivity premiums</span>
              <span className="text-sm font-semibold text-amber-600">+{fmtChf(opt.totalExclusivityCents)}</span>
            </div>
          )}
          <div className="flex items-start justify-between">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <div className="text-right">
              <span className="text-xl font-bold text-gray-900">{est(opt.totalCents).chf}</span>
              {est(opt.totalCents).estimate && (
                <span className="block text-sm text-gray-500">({est(opt.totalCents).estimate})</span>
              )}
            </div>
          </div>
        </div>

        {/* Per-proposal highlights */}
        {filteredHighlights.length > 0 && (
          <div className="border border-gray-200 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">What&apos;s included</h4>
            <ul className="space-y-1.5">
              {filteredHighlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  {h}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyQuote() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
        <Package className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">No quote found</h2>
      <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
        This link doesn&apos;t contain a valid sponsor quote. Please ask your contact at ZurichJS to send you a new link.
      </p>
      <Link href="/sponsorship">
        <Button variant="primary" size="md">
          View Sponsorship Options <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SponsorQuotePage() {
  const [quoteState, setQuoteState] = useState<SponsorQuoteState | null>(null);
  const [breakdown, setBreakdown] = useState<SponsorQuoteBreakdown | null>(null);
  const [loaded, setLoaded] = useState(false);
  const { rates } = useExchangeRate();

  useEffect(() => {
    const state = getQuoteFromUrl();
    if (state) {
      setQuoteState(state);
      setBreakdown(computeSponsorQuoteBreakdown(state));

      analytics.track('sponsor_quote_viewed', {
        company_name: state.companyName || 'unknown',
        option_count: state.options.length,
        currency: state.currency,
      });
    }
    setLoaded(true);
  }, []);

  // Intersection observer for mobile sticky bar
  const [summaryVisible, setSummaryVisible] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = summaryRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setSummaryVisible(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loaded, breakdown]);

  if (!loaded) return null;

  if (!quoteState || !breakdown) {
    return (
      <>
        <SEO title="Sponsor Quote — ZurichJS Conf" description="View your ZurichJS Conf sponsorship quote." canonical="/sponsor-quote" />
        <NavBar />
        <main className="min-h-screen bg-white pt-24 pb-36 md:pt-36">
          <SectionContainer>
            <EmptyQuote />
          </SectionContainer>
        </main>
        <ShapedSection shape="straight" variant="dark" compactTop>
          <SiteFooter showContactLinks />
        </ShapedSection>
      </>
    );
  }

  const { options, recommendedIndex, currency } = breakdown;
  const featuredOption = recommendedIndex >= 0 ? options[recommendedIndex] : options[0];

  return (
    <>
      <SEO
        title={quoteState.companyName ? `Sponsor Quote for ${quoteState.companyName} — ZurichJS Conf` : 'Sponsor Quote — ZurichJS Conf'}
        description="Your custom sponsorship quote for ZurichJS Conf 2026."
        canonical="/sponsor-quote"
      />
      <NavBar />

      <main className="min-h-screen bg-white pt-24 pb-36 md:pt-36 lg:pb-40">
        <SectionContainer>
          {/* Hero */}
          <div className="max-w-3xl mb-8 md:mb-12">
            <Kicker variant="light">Sponsorship Quote</Kicker>
            <Heading level="h1" variant="light" className="mt-3 mb-3 md:mb-4">
              {quoteState.contactName
                ? `Hey ${quoteState.contactName}, here's your sponsorship quote`
                : 'Your ZurichJS Conf Sponsorship Quote'}
            </Heading>
            {quoteState.companyName && (
              <p className="text-base md:text-lg text-gray-600 mb-1">
                Company: <span className="font-medium text-gray-800">{quoteState.companyName}</span>
              </p>
            )}
            <p className="text-base md:text-lg text-gray-600 leading-relaxed">
              {options.length === 1
                ? "Here's your custom sponsorship package."
                : `We've prepared ${options.length} options for your consideration. Compare them below.`}
            </p>
            {quoteState.validUntil && (
              <p className="text-sm text-gray-500 mt-2">
                This quote is valid until <span className="font-medium">{formatValidityDate(quoteState.validUntil)}</span>.
              </p>
            )}
            {currency !== 'CHF' && (
              <p className="text-xs text-gray-400 mt-3 bg-gray-50 rounded-lg px-3 py-2">
                All prices are in CHF. {currency} amounts shown in brackets are estimates based on current exchange rates and do not reflect the final invoiced amount.
              </p>
            )}
          </div>

          {/* Options grid */}
          <div ref={summaryRef} className={`grid gap-6 ${
            options.length === 1
              ? 'grid-cols-1 max-w-2xl'
              : options.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}>
            {options.map((opt, idx) => (
              <OptionCard
                key={opt.optionId}
                opt={opt}
                index={idx}
                isRecommended={idx === recommendedIndex && options.length > 1}
                currency={currency}
                rates={rates}
                totalOptions={options.length}
                highlights={quoteState.options[idx]?.highlights ?? []}
              />
            ))}
          </div>

        </SectionContainer>
      </main>

      <ShapedSection shape="straight" variant="dark" compactTop>
        <SiteFooter showContactLinks />
      </ShapedSection>

      {/* Sticky mobile bar */}
      {featuredOption && (
        <div
          className={`fixed bottom-0 inset-x-0 z-40 lg:hidden bg-black border-t border-brand-gray-dark px-4 py-3 transition-transform duration-300 ${
            summaryVisible ? 'translate-y-full' : 'translate-y-0'
          }`}
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="block text-[11px] text-brand-gray-light">
                {options.length === 1 ? 'Total' : 'Recommended'}
              </span>
              <span className="block text-lg font-bold text-white">
                {fmtChf(featuredOption.totalCents)}
              </span>
              {(() => { const e = fmtWithEstimate(featuredOption.totalCents, currency, rates); return e.estimate ? <span className="block text-xs text-brand-gray-medium">({e.estimate})</span> : null; })()}
            </div>
            <a href="mailto:hello@zurichjs.com">
              <Button variant="primary" size="md" className="shrink-0">
                Get in touch <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </a>
          </div>
        </div>
      )}
    </>
  );
}
