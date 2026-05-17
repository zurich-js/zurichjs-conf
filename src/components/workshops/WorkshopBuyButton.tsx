/**
 * WorkshopBuyButton
 * Price + add-to-cart chip rendered inside a workshop SessionCard.
 * The offering is passed in as a prop (resolved by the parent's single schedule
 * query) so we don't run N per-card pricing queries.
 */

import { Check } from 'lucide-react';
import { Button } from '@/components/atoms';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/contexts/ToastContext';
import { formatPrice } from '@/lib/cart';
import { analytics } from '@/lib/analytics';
import type { WorkshopOfferingSummary } from '@/lib/workshops/stripePriceLookup';

interface WorkshopBuyButtonProps {
  offering: WorkshopOfferingSummary;
  title: string;
  /** Optional override for what happens after add-to-cart. When omitted, the
   *  button stays on the page and shows a toast with a "View cart" action. */
  onAdded?: () => void;
  variant?: 'primary' | 'blue' | 'ghost';
  size?: 'sm' | 'md';
}

export function WorkshopBuyButton({
  offering,
  title,
  onAdded,
  variant = 'blue',
  size = 'sm',
}: WorkshopBuyButtonProps) {
  const { addToCart, isInCart, navigateToCart } = useCart();
  const { addToast } = useToast();
  const itemId = `workshop_${offering.workshopId}`;
  const alreadyInCart = isInCart(itemId);

  const handleAdd = () => {
    if (!alreadyInCart) {
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
      analytics.track('workshop_added_to_cart', {
        workshop_amount: offering.unitAmount / 100,
        currency: offering.currency,
        quantity: 1,
      });
      addToast({
        type: 'success',
        title: 'Added to cart',
        message: `${title} is in your cart.`,
        action: { label: 'View cart', onClick: navigateToCart },
      });
    }
    onAdded?.();
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-bold text-brand-black">
        {formatPrice(offering.unitAmount / 100, offering.currency)}
      </span>
      {offering.capacityRemaining > 0 && offering.capacityRemaining <= 5 && (
        <span className="text-xs text-brand-orange">
          {offering.capacityRemaining} seats left
        </span>
      )}
      {alreadyInCart ? (
        <button
          type="button"
          onClick={navigateToCart}
          className={`inline-flex items-center gap-1.5 rounded-full bg-brand-gray-darkest text-brand-white font-bold hover:bg-brand-black transition-colors cursor-pointer ${
            size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-md'
          }`}
        >
          <Check size={14} />
          In cart
        </button>
      ) : (
        <Button
          variant={offering.soldOut ? 'ghost' : variant}
          size={size}
          onClick={offering.soldOut ? undefined : handleAdd}
          disabled={offering.soldOut}
        >
          {offering.soldOut ? 'Sold out' : 'Add to cart'}
        </Button>
      )}
    </div>
  );
}
