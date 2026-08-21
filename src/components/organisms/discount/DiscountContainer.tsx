/**
 * Discount Container
 *
 * Orchestrates rendering of DiscountModal or DiscountWidget
 * based on the current discount state. Wraps in AnimatePresence.
 */

import { useCallback } from 'react';
import { useRouter } from 'next/router';
import { AnimatePresence } from 'framer-motion';
import { useCart } from '@/contexts/CartContext';
import { useDiscount } from '@/hooks/useDiscount';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { DiscountModal } from './DiscountModal';
import { DiscountWidget } from './DiscountWidget';

export function DiscountContainer() {
  const { cart } = useCart();
  const {
    state,
    discountData,
    countdown,
    personalization,
    offerPercentOff,
    isGeneratingCode,
    emailSubmitFailed,
    codeEmailed,
    submitEmail,
    dismiss,
    reopen,
    copyCode,
    // A visitor with items in their cart is already buying — never interrupt
    // that with the offer popup. The corner widget (existing code) still shows.
  } = useDiscount({ suppressAutoOpen: cart.items.length > 0 });
  const router = useRouter();
  const [, setPendingVoucher] = useLocalStorage('zurichjs_pending_voucher');

  // Deep-link the code into the purchase flow: park it as a pending voucher
  // (the cart auto-applies it once items exist) and send the visitor to their
  // cart, or to the tickets section when the cart is still empty.
  const useCode = useCallback(() => {
    if (!discountData) return;
    setPendingVoucher(discountData.code);
    dismiss();
    void router.push(cart.items.length > 0 ? '/cart' : '/#tickets');
  }, [discountData, cart.items.length, setPendingVoucher, dismiss, router]);

  return (
    <AnimatePresence mode="wait">
      {state === 'modal_open' && (
        <DiscountModal
          key="discount-modal"
          data={discountData}
          countdown={countdown}
          offerPercentOff={offerPercentOff}
          isGenerating={isGeneratingCode}
          emailSubmitFailed={emailSubmitFailed}
          codeEmailed={codeEmailed}
          personalization={personalization}
          onDismiss={dismiss}
          onSubmitEmail={submitEmail}
          onCopyCode={copyCode}
          onUseCode={useCode}
        />
      )}

      {state === 'minimized' && (
        <DiscountWidget
          key="discount-widget"
          countdown={countdown}
          percentOff={discountData?.percentOff ?? offerPercentOff}
          hasCode={discountData !== null}
          onReopen={reopen}
        />
      )}
    </AnimatePresence>
  );
}
