/**
 * Public Quote Page
 *
 * Client-facing read-only view of a B2B quote.
 * Reads quote state from the `?q=` URL parameter (base64-encoded JSON).
 * Follows the trip-cost calculator visual style.
 */

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Crown, Sparkles, Check, Users, GraduationCap, Ticket, Star } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { NavBar } from '@/components/organisms/NavBar';
import { SectionContainer } from '@/components/organisms/SectionContainer';
import { Button } from '@/components/atoms/Button';
import { Heading } from '@/components/atoms/Heading';
import { Kicker } from '@/components/atoms/Kicker';
import { SiteFooter, ShapedSection } from '@/components/organisms';
import { SeebadEngeModal } from '@/components/molecules';
import type { B2BQuoteState, QuoteBreakdown, QuoteOptionBreakdown, QuoteCurrency } from '@/lib/types/b2b-quote';
import {
  decodeQuoteFromUrl,
  computeQuoteBreakdown,
  formatQuoteAmount,
} from '@/lib/b2b/quote-calculations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getQuoteFromUrl(): B2BQuoteState | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (!q) return null;
  return decodeQuoteFromUrl(q);
}

// ---------------------------------------------------------------------------
// Option Card (single quote option display)
// ---------------------------------------------------------------------------

function OptionCard({
  opt,
  index,
  isBestValue,
  currency,
  totalOptions,
  onSeebadClick,
}: {
  opt: QuoteOptionBreakdown;
  index: number;
  isBestValue: boolean;
  currency: QuoteCurrency;
  totalOptions: number;
  onSeebadClick: () => void;
}) {
  const hasStandard = opt.standardTickets.quantity > 0;
  const hasVip = opt.vipTickets.quantity > 0;
  const hasWorkshops = opt.workshops.length > 0;
  const hasCustomItems = opt.customLineItems.length > 0;

  return (
    <div className={`border rounded-2xl overflow-hidden ${isBestValue ? 'border-2 border-brand-primary' : 'border-gray-200'}`}>
      {/* Header */}
      <div className={`px-5 sm:px-6 py-4 ${isBestValue ? 'bg-brand-primary/10' : 'bg-gray-50'}`}>
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
          {isBestValue && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-primary text-black text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> Most savings
            </span>
          )}
        </div>
      </div>

      <div className="px-5 sm:px-6 py-5 space-y-5">
        {/* Ticket breakdown */}
        {(hasStandard || hasVip) && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Ticket className="w-4 h-4 text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-700">Conference Tickets</h4>
            </div>
            <div className="space-y-2">
              {hasStandard && (
                <LineRow
                  label={`${opt.standardTickets.quantity}× Standard Ticket`}
                  unitLabel={formatQuoteAmount(opt.standardTickets.unitPriceCents, currency)}
                  discount={opt.standardTickets.discountPercent > 0 ? `${opt.standardTickets.discountPercent}% off` : undefined}
                  originalAmount={opt.standardTickets.discountCents > 0 ? opt.standardTickets.subtotalCents : undefined}
                  amount={opt.standardTickets.netCents}
                  currency={currency}
                />
              )}
              {hasVip && (
                <LineRow
                  label={`${opt.vipTickets.quantity}× VIP Ticket`}
                  unitLabel={formatQuoteAmount(opt.vipTickets.unitPriceCents, currency)}
                  discount={opt.vipTickets.discountPercent > 0 ? `${opt.vipTickets.discountPercent}% off` : undefined}
                  originalAmount={opt.vipTickets.discountCents > 0 ? opt.vipTickets.subtotalCents : undefined}
                  amount={opt.vipTickets.netCents}
                  currency={currency}
                />
              )}
            </div>
          </div>
        )}

        {/* Workshop breakdown */}
        {hasWorkshops && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-4 h-4 text-gray-400" />
              <h4 className="text-sm font-semibold text-gray-700">Workshops</h4>
            </div>
            <div className="space-y-2">
              {opt.workshops.map((ws) => (
                <LineRow
                  key={ws.workshopId}
                  label={`${ws.quantity}× ${ws.title || 'Workshop'}`}
                  unitLabel={formatQuoteAmount(ws.unitPriceCents, currency)}
                  discount={
                    ws.vipSavingsCents > 0
                      ? `VIP discount -${formatQuoteAmount(ws.vipSavingsCents, currency)}`
                      : ws.discountPercent > 0
                        ? `${ws.discountPercent}% off`
                        : undefined
                  }
                  originalAmount={(ws.discountCents + ws.vipSavingsCents) > 0 ? ws.subtotalCents : undefined}
                  amount={ws.netCents}
                  currency={currency}
                  href={ws.slug ? `/workshops/${ws.slug}` : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* Custom line items */}
        {hasCustomItems && (
          <div className="space-y-2">
            {opt.customLineItems.map((item) => (
              <LineRow
                key={item.id}
                label={`${item.quantity}× ${item.label || 'Item'}`}
                unitLabel={formatQuoteAmount(item.unitPriceCents, currency)}
                amount={item.subtotalCents}
                currency={currency}
              />
            ))}
          </div>
        )}

        {/* Custom discounts */}
        {opt.customDiscounts.length > 0 && (
          <div className="space-y-1.5">
            {opt.customDiscounts.map((d) => (
              <div key={d.id} className="flex items-baseline justify-between">
                <span className="text-sm text-green-600">{d.label || 'Discount'}</span>
                <span className="text-sm font-medium text-green-600">-{formatQuoteAmount(d.amountCents, currency)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          {opt.totalDiscountCents > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-gray-500">Original price</span>
              <span className="text-sm text-gray-400 line-through">{formatQuoteAmount(opt.subtotalCents, currency)}</span>
            </div>
          )}
          {opt.totalDiscountCents > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-green-600 font-medium">Total savings</span>
              <span className="text-sm font-semibold text-green-600">-{formatQuoteAmount(opt.totalDiscountCents, currency)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold text-gray-900">Total</span>
            <span className="text-xl font-bold text-gray-900">{formatQuoteAmount(opt.totalCents, currency)}</span>
          </div>
          {opt.totalPeople > 0 && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500">
                <Users className="w-3 h-3 inline mr-1" />
                Per person ({opt.totalPeople} attendees)
              </span>
              <span className="text-sm text-gray-600 font-medium">{formatQuoteAmount(opt.perPersonCents, currency)}</span>
            </div>
          )}
        </div>

        {/* VIP benefits */}
        {opt.vipBenefits.length > 0 && (
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2.5">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-800">VIP Benefits Included</span>
            </div>
            <ul className="space-y-1.5">
              {opt.vipBenefits.map((b) => {
                const isSeebad = b.toLowerCase().includes('seebad');
                return (
                  <li key={b} className="text-sm text-gray-600 flex items-start gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    {isSeebad ? (
                      <button
                        type="button"
                        onClick={onSeebadClick}
                        className="text-left text-amber-700 hover:text-amber-900 underline decoration-dotted underline-offset-2 transition-colors cursor-pointer font-medium"
                      >
                        {b}
                      </button>
                    ) : b}
                  </li>
                );
              })}
            </ul>
            {opt.totalVipWorkshopSavingsCents > 0 && (
              <p className="text-sm text-green-600 font-medium mt-2">
                Workshop savings from VIP: -{formatQuoteAmount(opt.totalVipWorkshopSavingsCents, currency)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Line row (single pricing line)
// ---------------------------------------------------------------------------

function LineRow({
  label,
  unitLabel,
  discount,
  originalAmount,
  amount,
  currency,
  href,
}: {
  label: string;
  unitLabel: string;
  discount?: string;
  originalAmount?: number;
  amount: number;
  currency: QuoteCurrency;
  href?: string;
}) {
  const labelContent = href ? (
    <Link href={href} target="_blank" className="text-sm text-gray-800 underline decoration-dotted underline-offset-2 hover:text-black transition-colors">
      {label}
    </Link>
  ) : (
    <span className="text-sm text-gray-800">{label}</span>
  );

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {labelContent}
        <span className="block text-xs text-gray-500">
          {unitLabel} each
          {discount && <span className="text-green-600 ml-1">({discount})</span>}
        </span>
      </div>
      <div className="text-right shrink-0">
        {originalAmount !== undefined && (
          <span className="block text-xs text-gray-400 line-through">{formatQuoteAmount(originalAmount, currency)}</span>
        )}
        <span className="text-sm font-medium text-gray-900">{formatQuoteAmount(amount, currency)}</span>
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
        <Ticket className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">No quote found</h2>
      <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
        This link doesn&apos;t contain a valid quote. Please ask your contact at ZurichJS to send you a new link.
      </p>
      <Link href="/">
        <Button variant="primary" size="md">
          Visit ZurichJS Conf <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/** Format an ISO date string (YYYY-MM-DD) to a human-friendly form like "Thursday, 29 May 2026" */
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

export default function QuotePage() {
  const [quoteState, setQuoteState] = useState<B2BQuoteState | null>(null);
  const [breakdown, setBreakdown] = useState<QuoteBreakdown | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [seebadOpen, setSeebadOpen] = useState(false);

  useEffect(() => {
    const state = getQuoteFromUrl();
    if (state) {
      setQuoteState(state);
      setBreakdown(computeQuoteBreakdown(state));
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
        <SEO title="Quote — ZurichJS Conf" description="View your ZurichJS Conf team quote." canonical="/quote" />
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

  const { options, bestValueIndex, currency } = breakdown;
  const bestOption = bestValueIndex >= 0 ? options[bestValueIndex] : options[0];

  return (
    <>
      <SEO
        title={quoteState.companyName ? `Quote for ${quoteState.companyName} — ZurichJS Conf` : 'Team Quote — ZurichJS Conf'}
        description="Your custom team quote for ZurichJS Conf 2026."
        canonical="/quote"
      />
      <NavBar />

      <main className="min-h-screen bg-white pt-24 pb-36 md:pt-36 lg:pb-40">
        <SectionContainer>
          {/* Hero */}
          <div className="max-w-3xl mb-8 md:mb-12">
            <Kicker variant="light">Team Quote</Kicker>
            <Heading level="h1" variant="light" className="mt-3 mb-3 md:mb-4">
              {quoteState.contactName
                ? `Hey ${quoteState.contactName}, here's your quote`
                : 'Your ZurichJS Conf Quote'}
            </Heading>
            {quoteState.companyName && (
              <p className="text-base md:text-lg text-gray-600 mb-1">
                Company: <span className="font-medium text-gray-800">{quoteState.companyName}</span>
              </p>
            )}
            <p className="text-base md:text-lg text-gray-600 leading-relaxed">
              {options.length === 1
                ? "Here's your custom conference package."
                : `We've prepared ${options.length} options for your team. Compare them below.`}
            </p>
            {quoteState.validUntil && (
              <p className="text-sm text-gray-500 mt-2">
                This quote is valid until <span className="font-medium">{formatValidityDate(quoteState.validUntil)}</span>.
              </p>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Tip: click on anything <span className="underline decoration-dotted underline-offset-2">underlined</span> to learn more about it.
            </p>
          </div>

          {/* Options grid */}
          <div className={`grid gap-6 ${
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
                isBestValue={idx === bestValueIndex && options.length > 1}
                currency={currency}
                totalOptions={options.length}
                onSeebadClick={() => setSeebadOpen(true)}
              />
            ))}
          </div>

          {/* Highlights summary */}
          {(quoteState.highlights ?? []).length > 0 && (
            <div className="mt-8 md:mt-12" ref={summaryRef}>
              <div className="border border-gray-200 rounded-2xl p-5 sm:p-6 max-w-2xl">
                <h3 className="text-base font-semibold text-gray-900 mb-3">What&apos;s included</h3>
                <ul className="space-y-2">
                  {(quoteState.highlights ?? []).filter(Boolean).map((h) => (
                    <li key={h} className="flex items-start gap-2 text-sm text-gray-700">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        </SectionContainer>
      </main>

      <ShapedSection shape="straight" variant="dark" compactTop>
        <SiteFooter showContactLinks />
      </ShapedSection>

      <SeebadEngeModal isOpen={seebadOpen} onClose={() => setSeebadOpen(false)} />

      {/* Sticky mobile bar */}
      {bestOption && (
        <div
          className={`fixed bottom-0 inset-x-0 z-40 lg:hidden bg-black border-t border-brand-gray-dark px-4 py-3 transition-transform duration-300 ${
            summaryVisible ? 'translate-y-full' : 'translate-y-0'
          }`}
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="block text-[11px] text-brand-gray-light">
                {options.length === 1 ? 'Total' : `Best option`}
              </span>
              <span className="block text-lg font-bold text-white">
                {formatQuoteAmount(bestOption.totalCents, currency)}
              </span>
              {bestOption.totalPeople > 0 && (
                <span className="block text-xs text-brand-gray-medium">
                  {formatQuoteAmount(bestOption.perPersonCents, currency)}/person
                </span>
              )}
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
