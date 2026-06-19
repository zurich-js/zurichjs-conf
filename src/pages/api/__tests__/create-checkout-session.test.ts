import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Cart } from '@/types/cart';
import type { CheckoutFormData } from '@/lib/validations/checkout';

const mocks = vi.hoisted(() => ({
  customersList: vi.fn(),
  customersCreate: vi.fn(),
  customersUpdate: vi.fn(),
  sessionsCreate: vi.fn(),
  pricesRetrieve: vi.fn(),
  couponsRetrieve: vi.fn(),
  promotionCodesRetrieve: vi.fn(),
  validateCheckoutPrices: vi.fn(),
  validateWorkshopCartItems: vi.fn(),
  supabaseFrom: vi.fn(),
  supabaseUpsert: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: class MockStripe {
    customers = {
      list: mocks.customersList,
      create: mocks.customersCreate,
      update: mocks.customersUpdate,
    };

    checkout = {
      sessions: {
        create: mocks.sessionsCreate,
      },
    };

    prices = {
      retrieve: mocks.pricesRetrieve,
    };

    coupons = {
      retrieve: mocks.couponsRetrieve,
    };

    promotionCodes = {
      retrieve: mocks.promotionCodesRetrieve,
    };
  },
}));

vi.mock('@/lib/stripe/validate-checkout', () => ({
  validateCheckoutPrices: mocks.validateCheckoutPrices,
}));

vi.mock('@/lib/workshops/validateCartItems', () => ({
  validateWorkshopCartItems: mocks.validateWorkshopCartItems,
}));

vi.mock('@/lib/url', () => ({
  getBaseUrl: vi.fn(() => 'https://conf.test'),
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: mocks.supabaseFrom,
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      error: mocks.loggerError,
      warn: mocks.loggerWarn,
      info: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

import handler from '../create-checkout-session';

interface MockResponse {
  _status: number;
  _json: unknown;
  status: (code: number) => MockResponse;
  json: (data: unknown) => MockResponse;
}

function createResponse(): MockResponse {
  const res: MockResponse = {
    _status: 200,
    _json: undefined,
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
  };
  return res;
}

async function callHandler(req: Partial<NextApiRequest>) {
  const res = createResponse();
  await handler(req as NextApiRequest, res as unknown as NextApiResponse);
  return res;
}

const customerInfo: CheckoutFormData = {
  email: 'buyer@example.com',
  phone: '+41 44 000 00 00',
  firstName: 'Buyer',
  lastName: 'Person',
  company: 'Acme AG',
  jobTitle: 'Engineer',
  addressLine1: 'Mainstrasse 1',
  addressLine2: '',
  city: 'Zurich',
  state: 'ZH',
  postalCode: '8001',
  country: 'Switzerland',
  agreeToTerms: true,
  subscribeNewsletter: true,
};

const ticketCart: Cart = {
  currency: 'CHF',
  totalItems: 3,
  totalPrice: 885,
  items: [
    {
      id: 'standard',
      title: 'Standard',
      price: 295,
      currency: 'CHF',
      quantity: 3,
      priceId: 'price_standard_chf',
      variant: 'standard',
    },
  ],
};

const mixedCart: Cart = {
  currency: 'CHF',
  totalItems: 3,
  totalPrice: 970,
  items: [
    {
      id: 'vip',
      title: 'VIP',
      price: 495,
      currency: 'CHF',
      quantity: 1,
      priceId: 'price_vip_chf',
      variant: 'vip',
    },
    {
      id: 'workshop_agents',
      kind: 'workshop',
      title: 'Agentic JS Workshop',
      price: 180,
      currency: 'CHF',
      quantity: 2,
      priceId: 'price_workshop_chf',
      workshopId: 'workshop_123',
    },
  ],
};

describe('/api/create-checkout-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    mocks.validateCheckoutPrices.mockResolvedValue({ valid: true, currentStage: 'early_bird' });
    mocks.validateWorkshopCartItems.mockResolvedValue({ valid: true, workshopsById: new Map() });
    mocks.customersList.mockResolvedValue({ data: [] });
    mocks.customersCreate.mockResolvedValue({ id: 'cus_new' });
    mocks.customersUpdate.mockResolvedValue({ id: 'cus_existing' });
    mocks.sessionsCreate.mockResolvedValue({
      id: 'cs_test_123',
      client_secret: 'cs_secret_123',
    });
    mocks.couponsRetrieve.mockResolvedValue({
      id: 'coupon_10',
      valid: true,
      metadata: { product_type: 'ticket' },
      applies_to: { products: [] },
    });
    mocks.pricesRetrieve.mockImplementation((priceId: string) => Promise.resolve({
      id: priceId,
      lookup_key: priceId === 'price_workshop_chf' ? 'workshop_agents_chf' : 'standard_early_bird_chf',
      product: priceId === 'price_workshop_chf' ? 'prod_workshop' : 'prod_ticket',
      active: true,
    }));
    mocks.supabaseFrom.mockReturnValue({
      upsert: mocks.supabaseUpsert,
      select: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
    mocks.supabaseUpsert.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
  });

  it('rejects invalid entry requests before contacting Stripe', async () => {
    expect((await callHandler({ method: 'GET' }))._status).toBe(405);

    const emptyCart = await callHandler({ method: 'POST', body: { cart: { ...ticketCart, items: [] }, customerInfo } });
    expect(emptyCart._status).toBe(400);
    expect(emptyCart._json).toEqual(expect.objectContaining({ error: 'Cart is empty' }));

    const missingCustomer = await callHandler({ method: 'POST', body: { cart: ticketCart } });
    expect(missingCustomer._status).toBe(400);
    expect(missingCustomer._json).toEqual(expect.objectContaining({ error: 'Customer information is required' }));
    expect(mocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it('creates a Stripe checkout session for multi-quantity ticket carts', async () => {
    const res = await callHandler({ method: 'POST', body: { cart: ticketCart, customerInfo } });

    expect(res._status).toBe(200);
    expect(res._json).toEqual({
      clientSecret: 'cs_secret_123',
      sessionId: 'cs_test_123',
    });
    expect(mocks.validateCheckoutPrices).toHaveBeenCalledWith(expect.any(Object), ['price_standard_chf']);
    expect(mocks.customersCreate).toHaveBeenCalledWith(expect.objectContaining({
      email: 'buyer@example.com',
      address: expect.objectContaining({ country: 'CH' }),
    }));
    expect(mocks.sessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
      mode: 'payment',
      ui_mode: 'custom',
      customer: 'cus_new',
      line_items: [{ price: 'price_standard_chf', quantity: 3 }],
      return_url: 'https://conf.test/success?session_id={CHECKOUT_SESSION_ID}',
    }));
  });

  it('reuses existing Stripe customers and applies vouchers', async () => {
    mocks.customersList.mockResolvedValueOnce({ data: [{ id: 'cus_existing' }] });
    const cartWithVoucher: Cart = {
      ...ticketCart,
      couponCode: 'coupon_10',
      discountType: 'percentage',
      discountValue: 10,
    };

    const res = await callHandler({ method: 'POST', body: { cart: cartWithVoucher, customerInfo } });

    expect(res._status).toBe(200);
    expect(mocks.customersUpdate).toHaveBeenCalledWith('cus_existing', expect.objectContaining({
      name: 'Buyer Person',
    }));
    expect(mocks.sessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_existing',
      discounts: [{ coupon: 'coupon_10' }],
    }));
  });

  it('persists workshop checkout snapshots for carts with workshops', async () => {
    const workshopAttendees = {
      workshop_123: [
        { firstName: 'One', lastName: 'Seat', email: 'one@example.com' },
        { firstName: 'Two', lastName: 'Seat', email: 'two@example.com' },
      ],
    };

    const res = await callHandler({
      method: 'POST',
      body: {
        cart: mixedCart,
        customerInfo: { ...customerInfo, workshopAttendees },
      },
    });

    expect(res._status).toBe(200);
    expect(mocks.sessionsCreate).toHaveBeenCalledWith(expect.objectContaining({
      line_items: [
        { price: 'price_vip_chf', quantity: 1 },
        { price: 'price_workshop_chf', quantity: 2 },
      ],
      metadata: expect.objectContaining({ has_workshops: 'true' }),
    }));
    expect(mocks.supabaseFrom).toHaveBeenCalledWith('checkout_cart_snapshots');
    expect(mocks.supabaseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        stripe_session_id: 'cs_test_123',
        workshop_attendees: workshopAttendees,
        cart_items: [
          {
            workshopId: 'workshop_123',
            priceId: 'price_workshop_chf',
            quantity: 2,
            title: 'Agentic JS Workshop',
          },
        ],
      }),
      { onConflict: 'stripe_session_id' }
    );
  });

  it('returns validation and Stripe failure paths', async () => {
    mocks.validateCheckoutPrices.mockResolvedValueOnce({
      valid: false,
      currentStage: 'late_bird',
      error: 'Price is no longer valid',
    });
    const priceFailure = await callHandler({ method: 'POST', body: { cart: ticketCart, customerInfo } });
    expect(priceFailure._status).toBe(400);
    expect(priceFailure._json).toEqual({ error: 'Price is no longer valid' });

    mocks.validateWorkshopCartItems.mockResolvedValueOnce({
      valid: false,
      error: 'Workshop sold out',
    });
    const workshopFailure = await callHandler({ method: 'POST', body: { cart: mixedCart, customerInfo } });
    expect(workshopFailure._status).toBe(400);
    expect(workshopFailure._json).toEqual({ error: 'Workshop sold out' });

    mocks.sessionsCreate.mockRejectedValueOnce(new Error('Stripe unavailable'));
    const stripeFailure = await callHandler({ method: 'POST', body: { cart: ticketCart, customerInfo } });
    expect(stripeFailure._status).toBe(500);
    expect(stripeFailure._json).toEqual({ error: 'Stripe unavailable' });
  });
});
