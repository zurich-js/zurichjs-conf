/**
 * StickyTicketCta Molecule
 *
 * Mobile-only fixed bottom bar with the current ticket price, the live
 * pricing-stage countdown, and a persistent "Get your ticket" CTA. High-intent
 * pages (/speakers, /schedule, workshop details) render it so visitors never
 * have to hunt for the ticket section on the homepage.
 *
 * Receives pricing data via props — pages wire it up with useTicketPricing().
 * Renders nothing until pricing has resolved.
 */

import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/atoms';
import { getStageConfig, type PriceStage } from '@/config/pricing-stages';
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

export function StickyTicketCta({ plans, currentStage, location, className = '' }: StickyTicketCtaProps) {
  const stageConfig = currentStage ? getStageConfig(currentStage) : undefined;
  const countdown = useCountdown(stageConfig?.endDate ?? '2099-01-01T00:00:00.000Z');

  const standardPlan = plans.find((plan) => plan.id === 'standard') ?? plans[0];
  if (!standardPlan || !currentStage || !stageConfig) return null;

  const countdownTitle = (STAGE_COPY[currentStage] ?? STAGE_COPY.standard).countdownTitle;

  return (
    <div
      className={`fixed bottom-0 inset-x-0 z-40 lg:hidden bg-black border-t border-brand-gray-dark px-4 py-3 ${className}`}
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <span className="block text-lg font-bold leading-tight text-white">
            From {formatPrice(standardPlan.price / 100, standardPlan.currency)}
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
          size="md"
          asChild
          href="/#tickets"
          className="shrink-0"
          onClick={() =>
            trackButtonClick({
              buttonText: 'Get your ticket',
              buttonLocation: `sticky_cta:${location}`,
              buttonAction: 'navigate_tickets',
            })
          }
        >
          Get your ticket
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
