import { describe, expect, it } from 'vitest';
import type { Cart, CartItem } from '@/types/cart';
import {
  addItem,
  applyVoucher,
  createEmptyCart,
  getOrderSummary,
  removeVoucher,
  updateQuantity,
} from '@/lib/cart-operations';
import { decodeCartState, encodeCartState } from '@/lib/cart-url-state';
import type { SupportedCurrency } from '@/config/currency';

const standardTicket: Omit<CartItem, 'quantity'> = {
  id: 'standard',
  title: 'Standard',
  price: 295,
  currency: 'CHF',
  priceId: 'price_standard_chf',
  variant: 'standard',
};

const vipTicket: Omit<CartItem, 'quantity'> = {
  id: 'vip',
  title: 'VIP',
  price: 495,
  currency: 'CHF',
  priceId: 'price_vip_chf',
  variant: 'vip',
};

const workshopSeat: Omit<CartItem, 'quantity'> = {
  id: 'workshop_agents',
  kind: 'workshop',
  title: 'Agentic JS Workshop',
  price: 180,
  currency: 'CHF',
  priceId: 'price_workshop_agents_chf',
  workshopId: 'workshop_123',
  workshopRoom: 'Room A',
  workshopDurationMinutes: 180,
};

function cartWith(
  items: Array<Omit<CartItem, 'quantity'> & { quantity: number }>,
  currency: SupportedCurrency = 'CHF'
): Cart {
  return items.reduce(
    (cart, item) => {
      const { quantity, ...rest } = item;
      return addItem(cart, rest, quantity);
    },
    createEmptyCart(currency)
  );
}

describe('cart flows', () => {
  it('calculates a single-ticket cart without vouchers', () => {
    const cart = cartWith([{ ...standardTicket, quantity: 1 }]);

    expect(cart.totalItems).toBe(1);
    expect(cart.totalPrice).toBe(295);
    expect(getOrderSummary(cart)).toEqual({
      subtotal: 295,
      discount: 0,
      vipWorkshopDiscount: 0,
      tax: 0,
      total: 295,
      currency: 'CHF',
    });
  });

  it('handles multi-quantity tickets and percentage vouchers', () => {
    const cart = applyVoucher(
      cartWith([{ ...standardTicket, quantity: 4 }]),
      'TEAM10',
      'percentage',
      10
    );

    expect(cart.totalItems).toBe(4);
    expect(getOrderSummary(cart)).toMatchObject({
      subtotal: 1180,
      discount: 118,
      total: 1062,
    });
  });

  it('applies restricted vouchers only to matching price IDs in multi-type carts', () => {
    const cart = applyVoucher(
      cartWith([
        { ...standardTicket, quantity: 2 },
        { ...vipTicket, quantity: 1 },
      ]),
      'STANDARD_ONLY',
      'percentage',
      20,
      ['price_standard_chf']
    );

    expect(getOrderSummary(cart)).toMatchObject({
      subtotal: 1085,
      discount: 118,
      total: 967,
    });
  });

  it('caps fixed vouchers at the eligible subtotal and removes them cleanly', () => {
    const discounted = applyVoucher(
      cartWith([{ ...standardTicket, quantity: 1 }]),
      'BIG_FIXED',
      'fixed',
      500
    );

    expect(getOrderSummary(discounted)).toMatchObject({
      subtotal: 295,
      discount: 295,
      total: 0,
    });

    const withoutVoucher = removeVoucher(discounted);
    expect(withoutVoucher.couponCode).toBeUndefined();
    expect(getOrderSummary(withoutVoucher)).toMatchObject({
      discount: 0,
      total: 295,
    });
  });

  it('preserves multiple currencies in cart summaries and URL recovery state', () => {
    const eurTicket: Omit<CartItem, 'quantity'> = {
      ...standardTicket,
      currency: 'EUR',
      price: 280,
      priceId: 'price_standard_eur',
    };
    const cart = cartWith([{ ...eurTicket, quantity: 2 }], 'EUR');
    const decoded = decodeCartState(encodeCartState(cart));

    expect(getOrderSummary(cart)).toMatchObject({
      subtotal: 560,
      total: 560,
      currency: 'EUR',
    });
    expect(decoded).toMatchObject({
      currency: 'EUR',
      totalItems: 2,
      totalPrice: 560,
    });
  });

  describe('VIP workshop perk', () => {
    it('auto-applies 20% off workshops when a VIP ticket shares the cart', () => {
      const cart = cartWith([
        { ...vipTicket, quantity: 1 },
        { ...workshopSeat, quantity: 1 },
      ]);

      // 20% of the 180 workshop seat = 36; ticket is untouched.
      expect(getOrderSummary(cart)).toMatchObject({
        subtotal: 675,
        vipWorkshopDiscount: 36,
        discount: 36,
        total: 639,
      });
    });

    it('discounts every workshop seat but never the VIP ticket', () => {
      const cart = cartWith([
        { ...vipTicket, quantity: 1 },
        { ...workshopSeat, quantity: 2 },
      ]);

      // 20% of (180 × 2) = 72.
      expect(getOrderSummary(cart)).toMatchObject({
        subtotal: 855,
        vipWorkshopDiscount: 72,
        discount: 72,
        total: 783,
      });
    });

    it('does not apply without a workshop in the cart', () => {
      const cart = cartWith([{ ...vipTicket, quantity: 1 }]);
      expect(getOrderSummary(cart)).toMatchObject({
        subtotal: 495,
        vipWorkshopDiscount: 0,
        discount: 0,
        total: 495,
      });
    });

    it('does not apply when no VIP ticket is present', () => {
      const cart = cartWith([
        { ...standardTicket, quantity: 1 },
        { ...workshopSeat, quantity: 1 },
      ]);
      expect(getOrderSummary(cart)).toMatchObject({
        vipWorkshopDiscount: 0,
        discount: 0,
        total: 475,
      });
    });

    it('lets a manual voucher win instead of stacking the VIP perk', () => {
      const cart = applyVoucher(
        cartWith([
          { ...vipTicket, quantity: 1 },
          { ...workshopSeat, quantity: 1 },
        ]),
        'PARTNER10',
        'percentage',
        10
      );

      // Manual 10% applies to the whole 675 subtotal; VIP perk is suppressed.
      expect(getOrderSummary(cart)).toMatchObject({
        subtotal: 675,
        vipWorkshopDiscount: 0,
        discount: 67.5,
        total: 607.5,
      });
    });
  });

  it('includes workshops in totals and keeps workshop metadata in recovery URLs', () => {
    const cart = updateQuantity(
      cartWith([
        { ...standardTicket, quantity: 1 },
        { ...workshopSeat, quantity: 2 },
      ]),
      'standard',
      3
    );
    const decoded = decodeCartState(encodeCartState(cart));

    expect(getOrderSummary(cart)).toMatchObject({
      subtotal: 1245,
      total: 1245,
    });
    expect(decoded?.items).toContainEqual(expect.objectContaining({
      kind: 'workshop',
      workshopId: 'workshop_123',
      workshopRoom: 'Room A',
      workshopDurationMinutes: 180,
      quantity: 2,
    }));
  });
});
