/**
 * Discount Container
 *
 * Orchestrates rendering of DiscountModal or DiscountWidget
 * based on the current discount state. Wraps in AnimatePresence.
 */

import { AnimatePresence } from 'framer-motion';
import { useDiscount } from '@/hooks/useDiscount';
import { DiscountModal } from './DiscountModal';
import { DiscountWidget } from './DiscountWidget';

export function DiscountContainer() {
  const { state, discountData, countdown, dismiss, reopen, copyCode } = useDiscount();

  return (
    <AnimatePresence mode="wait">
      {state === 'modal_open' && discountData && (
        <DiscountModal
          key="discount-modal"
          data={discountData}
          countdown={countdown}
          onDismiss={dismiss}
          onCopyCode={copyCode}
        />
      )}

      {state === 'minimized' && discountData && (
        <DiscountWidget
          key="discount-widget"
          countdown={countdown}
          percentOff={discountData.percentOff}
          onReopen={reopen}
        />
      )}
    </AnimatePresence>
  );
}
