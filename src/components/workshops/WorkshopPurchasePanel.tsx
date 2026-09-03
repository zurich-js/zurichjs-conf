/**
 * WorkshopPurchasePanel
 * Renders price + add-to-cart CTA for a workshop detail page.
 * Falls back to a "Purchases open soon" message when no offering is published.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { trackWorkshopAddedToCart } from '@/lib/analytics';
import { BellRing, Check, GraduationCap, MapPin, Timer, Users } from 'lucide-react';
import { Button, Heading } from '@/components/atoms';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/contexts/ToastContext';
import { useCartRoutePrefetch } from '@/hooks/useCartRoutePrefetch';
import { createWorkshopPricingQueryOptions } from '@/lib/queries/workshops';
import { formatPrice } from '@/lib/cart';
import { formatDuration, formatWorkshopAvailability } from '@/components/scheduling/utils';
import { cn } from '@/lib/utils';
import { WorkshopWaitlistModal } from './WorkshopWaitlistModal';

interface WorkshopPurchasePanelProps {
  /** Program session id — preferred match for post-CFP workshop offerings. */
  sessionId: string;
  /** Optional legacy CFP submission id — used as a fallback for older workshop offerings. */
  cfpSubmissionId?: string | null;
  /** Title-derived session slug — used as a fallback filter on the pricing API. */
  sessionSlug: string;
  /** Human-readable title used in the cart line. */
  title: string;
}

const AVAILABILITY_TONE_CLASSES = {
  red: 'text-brand-red',
  orange: 'text-brand-orange',
  yellow: 'text-brand-yellow-main',
  green: 'text-brand-green',
} as const;

export function WorkshopPurchasePanel({
  cfpSubmissionId,
  sessionId,
  sessionSlug,
  title,
}: WorkshopPurchasePanelProps) {
  const { currency } = useCurrency();
  const router = useRouter();
  const { addToCart, isInCart, navigateToCart } = useCart();
  useCartRoutePrefetch();
  const { addToast } = useToast();
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);

  const queryOptions = useMemo(
    () => createWorkshopPricingQueryOptions({ currency, sessionId, cfpSubmissionId: cfpSubmissionId ?? undefined, sessionSlug }),
    [currency, cfpSubmissionId, sessionId, sessionSlug]
  );
  const { data, isLoading, isError } = useQuery(queryOptions);
  const offering =
    data?.items.find((item) => item.sessionId === sessionId) ??
    (cfpSubmissionId ? data?.items.find((item) => item.cfpSubmissionId === cfpSubmissionId) : undefined) ??
    data?.items[0] ??
    null;

  const itemId = offering ? `workshop_${offering.workshopId}` : null;
  const alreadyInCart = itemId ? isInCart(itemId) : false;

  const handleAddToCart = () => {
    if (!offering || !itemId) return;
    if (alreadyInCart) {
      navigateToCart();
      return;
    }
    addToCart({
      id: itemId,
      kind: 'workshop',
      workshopId: offering.workshopId,
      title,
      price: offering.unitAmount / 100,
      currency: offering.currency,
      priceId: offering.priceId,
      workshopRoom: offering.room,
      workshopDurationMinutes: offering.durationMinutes,
    });
    trackWorkshopAddedToCart({
      workshopId: offering.workshopId,
      workshopTitle: title,
      amount: offering.unitAmount / 100,
      currency: offering.currency,
    });
    addToast({
      type: 'success',
      title: 'Added to cart',
      message: `${title} is in your cart. Add more workshops or check out.`,
      action: { label: 'View cart', onClick: navigateToCart },
    });
  };

  return (
    <section id="purchase" className="scroll-mt-24">
      <div className="rounded-2xl border border-brand-black/10 bg-brand-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-black/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-black/70">
              <GraduationCap size={14} /> Workshop seat
            </div>
            <Heading level="h2" variant="light" className="mt-4 text-xl md:text-2xl">
              Secure your spot
            </Heading>
            {offering && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-brand-black/70">
                {offering.durationMinutes ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Timer size={14} /> {formatDuration(offering.durationMinutes)}
                  </span>
                ) : null}
                {offering.room ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} /> {offering.room}
                  </span>
                ) : null}
                {(() => {
                  const availability = formatWorkshopAvailability(offering);
                  return (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 font-semibold',
                        AVAILABILITY_TONE_CLASSES[availability.tone]
                      )}
                    >
                      <Users size={14} aria-hidden="true" />
                      {availability.label}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          {offering && (
            <div className="sm:text-right">
              <div className="text-xs uppercase tracking-wide text-brand-black/50">Price</div>
              <div className="text-2xl sm:text-3xl font-bold text-brand-black">
                {formatPrice(offering.unitAmount / 100, offering.currency)}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {isLoading && <p className="text-sm text-brand-black/60">Loading pricing…</p>}
          {isError && (
            <p className="text-sm text-red-700">Could not load pricing. Please try again.</p>
          )}
          {!isLoading && !isError && !offering && (
            <p className="text-sm text-brand-black/70">
              Workshop purchases aren&apos;t open yet — check back soon.
            </p>
          )}
          {offering && !offering.soldOut && alreadyInCart && (
            <button
              type="button"
              onClick={handleAddToCart}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-md font-bold bg-brand-gray-darkest text-brand-white hover:bg-brand-black transition-colors cursor-pointer"
            >
              <Check size={16} />
              View in cart
            </button>
          )}
          {offering?.soldOut && (
            <Button variant="blue" onClick={() => setIsWaitlistOpen(true)}>
              <BellRing size={16} aria-hidden="true" />
              Join the waitlist
            </Button>
          )}
          {offering && !offering.soldOut && !alreadyInCart && (
            <Button variant="blue" onClick={handleAddToCart}>
              Add to cart
            </Button>
          )}
          {offering && (
            <button
              onClick={() => router.push('/workshops')}
              className="text-sm font-medium text-brand-black/70 underline-offset-4 hover:underline cursor-pointer"
            >
              {alreadyInCart ? 'Add another workshop' : 'Back to workshops'}
            </button>
          )}
        </div>
      </div>

      {offering && (
        <WorkshopWaitlistModal
          isOpen={isWaitlistOpen}
          workshopId={offering.workshopId}
          workshopTitle={title}
          onClose={() => setIsWaitlistOpen(false)}
        />
      )}
    </section>
  );
}
