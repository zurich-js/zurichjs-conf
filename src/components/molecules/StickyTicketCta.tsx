/**
 * StickyTicketCta Molecule
 *
 * Mobile-only fixed bottom bar with the current ticket price, the live
 * pricing-stage countdown, and a persistent "Get your ticket" CTA — so
 * visitors never have to hunt for the ticket section on the homepage.
 * Currently rendered by /speakers and /about.
 *
 * Receives pricing data via props — pages wire it up with useTicketPricing().
 * Renders nothing until pricing has resolved.
 */

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/atoms';
import { getStageConfig, type PriceStage } from '@/config/pricing-stages';
import { useCart } from '@/contexts/CartContext';
import { STAGE_COPY } from '@/data/tickets';
import { useCountdown, padZero } from '@/hooks/useCountdown';
import { trackButtonClick } from '@/lib/analytics';
import { formatPrice } from '@/lib/cart';
import type { TicketPlan } from '@/hooks/useTicketPricing';

export interface StickyTicketCtaProps {
  plans: TicketPlan[];
  currentStage: PriceStage | null;
  /** Where the bar is rendered, for analytics (e.g. 'speakers') */
  location: string;
  className?: string;
}

function formatStageCountdown(days: number, hours: number, minutes: number, seconds: number): string {
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}:${padZero(minutes)}:${padZero(seconds)}`;
}

/** Reveal only after the hero (with its own CTA) has scrolled away, so the
 *  first viewport never shows two ticket CTAs at once. */
const SCROLL_REVEAL_PX = 400;

export function StickyTicketCta({ plans, currentStage, location, className = '' }: StickyTicketCtaProps) {
  const { cart } = useCart();
  const stageConfig = currentStage ? getStageConfig(currentStage) : undefined;
  const countdown = useCountdown(stageConfig?.endDate ?? '2099-01-01T00:00:00.000Z');
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const onScroll = () => setRevealed(window.scrollY > SCROLL_REVEAL_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const standardPlan = plans.find((plan) => plan.id === 'standard') ?? plans[0];
  if (!standardPlan || !currentStage || !stageConfig) return null;

  const countdownTitle = (STAGE_COPY[currentStage] ?? STAGE_COPY.standard).countdownTitle;

  // A visitor with a cart in progress gets a resume nudge instead of a second
  // "buy" message — one bar, one intent.
  const hasCart = cart.items.length > 0;
  const label = hasCart ? 'Resume checkout' : 'Get tickets';

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 lg:hidden bg-black border-t border-brand-gray-dark px-4 py-3 transition-transform duration-300 ${revealed ? 'translate-y-0' : 'translate-y-full'} ${className}`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="block text-sm font-semibold leading-tight text-white">
            {hasCart
              ? `Your cart · ${formatPrice(cart.totalPrice, cart.currency)}`
              : `From ${formatPrice(standardPlan.price / 100, standardPlan.currency)}`}
          </span>
          {!countdown.isComplete && (
            <span className="block text-[11px] text-brand-gray-light">
              {countdownTitle}{' '}
              <span className="font-mono font-semibold text-brand-yellow-main">
                {formatStageCountdown(countdown.days, countdown.hours, countdown.minutes, countdown.seconds)}
              </span>
            </span>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          asChild
          href={hasCart ? '/cart' : '/#tickets'}
          className="shrink-0"
          onClick={() =>
            trackButtonClick({
              buttonText: label,
              buttonLocation: `sticky_cta:${location}`,
              buttonAction: hasCart ? 'resume_cart' : 'navigate_tickets',
            })
          }
        >
          {label}
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
