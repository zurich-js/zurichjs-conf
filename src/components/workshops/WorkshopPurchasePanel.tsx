/**
 * WorkshopPurchasePanel
 * Renders price + add-to-cart CTA for a workshop detail page.
 * Falls back to a "Purchases open soon" message when no offering is published.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useRouter } from 'next/router';
import { GraduationCap, MapPin, Timer, Users } from 'lucide-react';
import { Button, Heading } from '@/components/atoms';
import { useCart } from '@/contexts/CartContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { createWorkshopPricingQueryOptions } from '@/lib/queries/workshops';
import { formatPrice } from '@/lib/cart';

interface WorkshopPurchasePanelProps {
  /** CFP submission id — matches the PublicSession.id on the detail page. */
  cfpSubmissionId: string;
  /** Title-derived session slug — used as a fallback filter on the pricing API. */
  sessionSlug: string;
  /** Human-readable title used in the cart line. */
  title: string;
}

export function WorkshopPurchasePanel({
  cfpSubmissionId,
  sessionSlug,
  title,
}: WorkshopPurchasePanelProps) {
  const { currency } = useCurrency();
  const router = useRouter();
  const { addToCart, isInCart, navigateToCart } = useCart();

  const queryOptions = useMemo(
    () => createWorkshopPricingQueryOptions({ currency, cfpSubmissionId, sessionSlug }),
    [currency, cfpSubmissionId, sessionSlug]
  );
  const { data, isLoading, isError } = useQuery(queryOptions);
  const offering =
    data?.items.find((item) => item.cfpSubmissionId === cfpSubmissionId) ??
    data?.items[0] ??
    null;

  const handleAddToCart = () => {
    if (!offering) return;
    const itemId = `workshop_${offering.workshopId}`;
    if (!isInCart(itemId)) {
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
    }
    navigateToCart();
  };

  return (
    <section id="purchase" className="scroll-mt-24">
      <div className="rounded-2xl border border-brand-black/10 bg-brand-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
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
                    <Timer size={14} /> {offering.durationMinutes} min
                  </span>
                ) : null}
                {offering.room ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} /> {offering.room}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <Users size={14} />
                  {offering.soldOut
                    ? 'Sold out'
                    : offering.capacityRemaining <= 5
                      ? `${offering.capacityRemaining} seats left`
                      : `${offering.capacity} seats`}
                </span>
              </div>
            )}
          </div>

          {offering && (
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-brand-black/50">Price</div>
              <div className="text-3xl font-bold text-brand-black">
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
          {offering && (
            <Button
              variant="blue"
              onClick={offering.soldOut ? undefined : handleAddToCart}
              disabled={offering.soldOut}
            >
              {offering.soldOut ? 'Sold out' : 'Add to cart'}
            </Button>
          )}
          {offering && (
            <button
              onClick={() => router.push('/workshops')}
              className="text-sm font-medium text-brand-black/70 underline-offset-4 hover:underline cursor-pointer"
            >
              Back to workshops
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
