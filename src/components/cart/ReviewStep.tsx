/**
 * Cart Review Step Component
 * Step 1: Review cart items, apply vouchers, see upsells
 */

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { CartItem, CartSummary, VoucherInput } from '@/components/molecules';
import { Button, Heading } from '@/components/atoms';
import type { ReviewStepProps, CartItem as CartItemType } from './types';

export function ReviewStep({
  cart,
  orderSummary,
  isPartialDiscount,
  showVipUpsell,
  showTeamUpsell,
  onNext,
  onQuantityChange,
  onRemove,
  onApplyVoucher,
  onRemoveVoucher,
  onUpgradeToVip,
  onTeamRequest,
}: ReviewStepProps) {
  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col lg:flex-row gap-8 justify-center"
    >
      {/* Ticket Items */}
      <div className="flex-[2_0_0] flex flex-col gap-5 max-w-screen-lg">
        <Heading level="h1" className="text-xl font-bold text-brand-white">Your tickets</Heading>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {cart.items.map((item: CartItemType, index: number) => (
              <CartItem
                key={item.id}
                item={item}
                onQuantityChange={onQuantityChange}
                onRemove={onRemove}
                delay={index * 0.05}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* VIP Upgrade Upsell Banner */}
        {showVipUpsell && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-md font-bold text-brand-white mb-1">
                  Want an extra special experience?
                </h3>
                <p className="text-sm text-brand-gray-light mb-4">
                  Get an <strong className="text-brand-yellow-main drop-shadow-md drop-shadow-brand-yellow-main/30">invite to the speaker city tour</strong>, <strong className="text-brand-yellow-main drop-shadow-md drop-shadow-brand-yellow-main/30">limited edition goodies</strong>, and <strong className="text-brand-yellow-main drop-shadow-md drop-shadow-brand-yellow-main/30">20% discount to all workshops</strong>. Only 15 VIP seats available!
                </p>
                <Button variant="primary" size="sm" onClick={onUpgradeToVip}>
                  Upgrade to VIP
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Team Package Upsell Banner */}
        {showTeamUpsell && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h3 className="text-md font-bold text-brand-white mb-1">
                  Coming as a group?
                </h3>
                <p className="text-sm text-brand-gray-light mb-4">
                  We offer <strong className="text-brand-yellow-main drop-shadow-md drop-shadow-brand-yellow-main/30">custom team pricing (from Early Bird onwards)</strong> and simplified invoicing for groups of 3+. Let us create a package tailored for your team!
                </p>
                <Button variant="primary" onClick={onTeamRequest} size="sm">
                  Request Team Quote
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Discount Code Input */}
        <div>
          <h3 className="text-lg font-semibold text-brand-white mb-4">Promo Code</h3>
          <VoucherInput onApply={onApplyVoucher} />
        </div>
      </div>

      {/* Order Summary Sidebar */}
      <div className="flex-[1_0_0] lg:max-w-screen-xs sticky top-24 flex flex-col gap-5">
        <Heading level="h2" className="text-lg mt-1.5 font-bold text-brand-white">Order summary</Heading>

        <CartSummary
          summary={orderSummary}
          showTax={false}
          showDiscount={true}
          voucherCode={cart.couponCode}
          discountType={cart.discountType}
          discountValue={cart.discountValue}
          isPartialDiscount={isPartialDiscount}
          onRemoveVoucher={onRemoveVoucher}
        />

        <Button variant="accent" onClick={onNext} className="w-full">
          Continue
        </Button>

        <Link href="/trip-cost">
          <Button className="w-full" asChild variant="ghost">
            Estimate your trip cost
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
