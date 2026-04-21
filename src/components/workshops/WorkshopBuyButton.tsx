/**
 * WorkshopBuyButton
 * Price + add-to-cart chip rendered inside a workshop SessionCard.
 * The offering is passed in as a prop (resolved by the parent's single schedule
 * query) so we don't run N per-card pricing queries.
 */

import { Button } from '@/components/atoms';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/cart';
import type { WorkshopOfferingSummary } from '@/lib/workshops/stripePriceLookup';

interface WorkshopBuyButtonProps {
  offering: WorkshopOfferingSummary;
  title: string;
  /** Optional override for what happens after add-to-cart. Defaults to navigating to /cart. */
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

  const handleAdd = () => {
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
    if (onAdded) onAdded();
    else navigateToCart();
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
      <Button
        variant={offering.soldOut ? 'ghost' : variant}
        size={size}
        onClick={offering.soldOut ? undefined : handleAdd}
        disabled={offering.soldOut}
      >
        {offering.soldOut ? 'Sold out' : 'Add to cart'}
      </Button>
    </div>
  );
}
