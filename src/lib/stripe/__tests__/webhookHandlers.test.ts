/**
 * Unit Tests for Stripe Webhook Handlers
 *
 * Tests for all logic in webhookHandlers.ts including:
 * - parseTicketInfo: Parse lookup key into category and stage
 * - getTicketDisplayName: Get display name for ticket
 * - toLegacyType: Map category/stage to legacy ticket type
 * - isTicketProduct: Check if price is a valid conference ticket
 * - isWorkshopVoucher: Check if price is a workshop voucher
 * - handleCheckoutSessionCompleted: Main webhook handler
 * - handleAsyncPaymentSucceeded: Async payment success handler
 * - handleAsyncPaymentFailed: Async payment failure handler
 * - handlePaymentIntentSucceeded: Payment intent handler
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type Stripe from 'stripe';

// Use vi.hoisted to create mock functions that are hoisted with vi.mock
const mocks = vi.hoisted(() => ({
  mockCustomersCreate: vi.fn().mockResolvedValue({ id: 'cus_mock123' }),
  mockListLineItems: vi.fn().mockResolvedValue({ data: [] }),
  mockCreateTicket: vi.fn().mockResolvedValue({
    success: true,
    ticket: {
      id: 'ticket_123',
      email: 'test@example.com',
      ticket_type: 'standard',
      amount_paid: 10000,
      qr_code_url: 'https://example.com/qr.png',
    },
  }),
  mockSendTicketConfirmationEmailsQueued: vi.fn().mockResolvedValue([{ success: true }]),
  mockSendVoucherConfirmationEmail: vi.fn().mockResolvedValue({ success: true }),
  mockAddNewsletterContact: vi.fn().mockResolvedValue({ success: true }),
  mockGenerateTicketPDF: vi.fn().mockResolvedValue(Buffer.from('mock-pdf')),
  mockImageUrlToDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
  mockGenerateOrderUrl: vi.fn().mockReturnValue('https://example.com/order/123'),
  mockServerAnalyticsTrack: vi.fn().mockResolvedValue(undefined),
  mockServerAnalyticsError: vi.fn().mockResolvedValue(undefined),
  mockSupabaseEq: vi.fn().mockResolvedValue({ data: [], error: null }),
}));

// Mock all external dependencies
vi.mock('../client', () => ({
  getStripeClient: vi.fn(() => ({
    customers: {
      create: mocks.mockCustomersCreate,
    },
    checkout: {
      sessions: {
        listLineItems: mocks.mockListLineItems,
      },
    },
  })),
}));

vi.mock('@/lib/tickets', () => ({
  createTicket: mocks.mockCreateTicket,
}));

vi.mock('@/lib/email', () => ({
  sendTicketConfirmationEmailsQueued: mocks.mockSendTicketConfirmationEmailsQueued,
  sendVoucherConfirmationEmail: mocks.mockSendVoucherConfirmationEmail,
  addNewsletterContact: mocks.mockAddNewsletterContact,
}));

vi.mock('@/config/pricing-stages', () => ({
  getCurrentStage: vi.fn(() => ({
    stage: 'early_bird',
    name: 'Early Bird',
    startDate: new Date(),
    endDate: new Date(),
  })),
}));

vi.mock('@/lib/pdf', () => ({
  generateTicketPDF: mocks.mockGenerateTicketPDF,
  imageUrlToDataUrl: mocks.mockImageUrlToDataUrl,
}));

vi.mock('@/lib/auth/orderToken', () => ({
  generateOrderUrl: mocks.mockGenerateOrderUrl,
}));

vi.mock('@/lib/analytics/server', () => ({
  serverAnalytics: {
    track: mocks.mockServerAnalyticsTrack,
    error: mocks.mockServerAnalyticsError,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    scope: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

vi.mock('@/lib/supabase', () => ({
  createServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: mocks.mockSupabaseEq,
      })),
    })),
  })),
}));

// Import after mocks are set up
import {
  __testing,
  handleCheckoutSessionCompleted,
  handleAsyncPaymentSucceeded,
  handleAsyncPaymentFailed,
  handlePaymentIntentSucceeded,
} from '../webhookHandlers';

const { parseTicketInfo, getTicketDisplayName, toLegacyType, isTicketProduct, isWorkshopVoucher } =
  __testing;

// ============================================================================
// parseTicketInfo Tests
// ============================================================================
describe('parseTicketInfo', () => {
  describe('special cases', () => {
    it('should return student category for student lookup key', () => {
      const result = parseTicketInfo('standard_student_unemployed');
      expect(result).toEqual({ category: 'student', stage: 'general_admission' });
    });

    it('should return student category when lookup key includes student', () => {
      const result = parseTicketInfo('some_student_key');
      expect(result).toEqual({ category: 'student', stage: 'general_admission' });
    });

    it('should return unemployed category when lookup key includes unemployed', () => {
      const result = parseTicketInfo('some_unemployed_key');
      expect(result).toEqual({ category: 'unemployed', stage: 'general_admission' });
    });
  });

  describe('category_stage pattern', () => {
    it('should parse standard_blind_bird correctly', () => {
      const result = parseTicketInfo('standard_blind_bird');
      expect(result).toEqual({ category: 'standard', stage: 'blind_bird' });
    });

    it('should parse standard_early_bird correctly', () => {
      const result = parseTicketInfo('standard_early_bird');
      expect(result).toEqual({ category: 'standard', stage: 'early_bird' });
    });

    it('should parse standard_standard correctly (maps to general_admission)', () => {
      const result = parseTicketInfo('standard_standard');
      expect(result).toEqual({ category: 'standard', stage: 'general_admission' });
    });

    it('should parse standard_general correctly (maps to general_admission)', () => {
      const result = parseTicketInfo('standard_general');
      expect(result).toEqual({ category: 'standard', stage: 'general_admission' });
    });

    it('should parse standard_late_bird correctly', () => {
      const result = parseTicketInfo('standard_late_bird');
      expect(result).toEqual({ category: 'standard', stage: 'late_bird' });
    });

    it('should parse vip_blind_bird correctly', () => {
      const result = parseTicketInfo('vip_blind_bird');
      expect(result).toEqual({ category: 'vip', stage: 'blind_bird' });
    });

    it('should parse vip_early_bird correctly', () => {
      const result = parseTicketInfo('vip_early_bird');
      expect(result).toEqual({ category: 'vip', stage: 'early_bird' });
    });

    it('should default to general_admission for unknown stage', () => {
      const result = parseTicketInfo('standard_unknown');
      expect(result).toEqual({ category: 'standard', stage: 'general_admission' });
    });
  });

  describe('no underscore', () => {
    it('should treat entire key as category when no underscore', () => {
      const result = parseTicketInfo('standard');
      expect(result).toEqual({ category: 'standard', stage: 'general_admission' });
    });

    it('should treat entire key as category for vip', () => {
      const result = parseTicketInfo('vip');
      expect(result).toEqual({ category: 'vip', stage: 'general_admission' });
    });
  });
});

// ============================================================================
// getTicketDisplayName Tests
// ============================================================================
describe('getTicketDisplayName', () => {
  describe('special categories', () => {
    it('should return "VIP Ticket" for vip category', () => {
      expect(getTicketDisplayName('vip', 'blind_bird')).toBe('VIP Ticket');
      expect(getTicketDisplayName('vip', 'early_bird')).toBe('VIP Ticket');
      expect(getTicketDisplayName('vip', 'general_admission')).toBe('VIP Ticket');
      expect(getTicketDisplayName('vip', 'late_bird')).toBe('VIP Ticket');
    });

    it('should return "Student Ticket" for student category', () => {
      expect(getTicketDisplayName('student', 'general_admission')).toBe('Student Ticket');
    });

    it('should return "Unemployed Ticket" for unemployed category', () => {
      expect(getTicketDisplayName('unemployed', 'general_admission')).toBe('Unemployed Ticket');
    });
  });

  describe('standard category with stages', () => {
    it('should return "Blind Bird" for blind_bird stage', () => {
      expect(getTicketDisplayName('standard', 'blind_bird')).toBe('Blind Bird');
    });

    it('should return "Early Bird" for early_bird stage', () => {
      expect(getTicketDisplayName('standard', 'early_bird')).toBe('Early Bird');
    });

    it('should return "Standard" for general_admission stage', () => {
      expect(getTicketDisplayName('standard', 'general_admission')).toBe('Standard');
    });

    it('should return "Late Bird" for late_bird stage', () => {
      expect(getTicketDisplayName('standard', 'late_bird')).toBe('Late Bird');
    });
  });
});

// ============================================================================
// toLegacyType Tests
// ============================================================================
describe('toLegacyType', () => {
  describe('special categories', () => {
    it('should return "vip" for vip category', () => {
      expect(toLegacyType('vip', 'blind_bird')).toBe('vip');
      expect(toLegacyType('vip', 'early_bird')).toBe('vip');
      expect(toLegacyType('vip', 'general_admission')).toBe('vip');
      expect(toLegacyType('vip', 'late_bird')).toBe('vip');
    });

    it('should return "student" for student category', () => {
      expect(toLegacyType('student', 'general_admission')).toBe('student');
    });

    it('should return "unemployed" for unemployed category', () => {
      expect(toLegacyType('unemployed', 'general_admission')).toBe('unemployed');
    });
  });

  describe('standard category with stages', () => {
    it('should return "blind_bird" for blind_bird stage', () => {
      expect(toLegacyType('standard', 'blind_bird')).toBe('blind_bird');
    });

    it('should return "early_bird" for early_bird stage', () => {
      expect(toLegacyType('standard', 'early_bird')).toBe('early_bird');
    });

    it('should return "standard" for general_admission stage', () => {
      expect(toLegacyType('standard', 'general_admission')).toBe('standard');
    });

    it('should return "late_bird" for late_bird stage', () => {
      expect(toLegacyType('standard', 'late_bird')).toBe('late_bird');
    });
  });
});

// ============================================================================
// isTicketProduct Tests
// ============================================================================
describe('isTicketProduct', () => {
  const createMockPrice = (lookupKey: string | null): Stripe.Price | undefined => {
    if (lookupKey === null) return undefined;
    return {
      lookup_key: lookupKey,
    } as Stripe.Price;
  };

  describe('invalid inputs', () => {
    it('should return false for undefined price', () => {
      expect(isTicketProduct(undefined)).toBe(false);
    });

    it('should return false for price without lookup_key', () => {
      expect(isTicketProduct({} as Stripe.Price)).toBe(false);
    });

    it('should return false for price with null lookup_key', () => {
      expect(isTicketProduct({ lookup_key: null } as Stripe.Price)).toBe(false);
    });
  });

  describe('special cases', () => {
    it('should return true for standard_student_unemployed', () => {
      expect(isTicketProduct(createMockPrice('standard_student_unemployed'))).toBe(true);
    });

    it('should return true for keys including "student"', () => {
      expect(isTicketProduct(createMockPrice('student_ticket'))).toBe(true);
      expect(isTicketProduct(createMockPrice('test_student_test'))).toBe(true);
    });

    it('should return true for keys including "unemployed"', () => {
      expect(isTicketProduct(createMockPrice('unemployed_ticket'))).toBe(true);
      expect(isTicketProduct(createMockPrice('test_unemployed_test'))).toBe(true);
    });
  });

  describe('valid category_stage patterns', () => {
    it('should return true for standard_blind_bird', () => {
      expect(isTicketProduct(createMockPrice('standard_blind_bird'))).toBe(true);
    });

    it('should return true for standard_early_bird', () => {
      expect(isTicketProduct(createMockPrice('standard_early_bird'))).toBe(true);
    });

    it('should return true for standard_standard', () => {
      expect(isTicketProduct(createMockPrice('standard_standard'))).toBe(true);
    });

    it('should return true for standard_general', () => {
      expect(isTicketProduct(createMockPrice('standard_general'))).toBe(true);
    });

    it('should return true for standard_late_bird', () => {
      expect(isTicketProduct(createMockPrice('standard_late_bird'))).toBe(true);
    });

    it('should return true for vip_blind_bird', () => {
      expect(isTicketProduct(createMockPrice('vip_blind_bird'))).toBe(true);
    });

    it('should return true for vip_early_bird', () => {
      expect(isTicketProduct(createMockPrice('vip_early_bird'))).toBe(true);
    });
  });

  describe('invalid patterns', () => {
    it('should return false for invalid category', () => {
      expect(isTicketProduct(createMockPrice('premium_blind_bird'))).toBe(false);
      expect(isTicketProduct(createMockPrice('gold_early_bird'))).toBe(false);
    });

    it('should return false for invalid stage', () => {
      expect(isTicketProduct(createMockPrice('standard_super_early'))).toBe(false);
      expect(isTicketProduct(createMockPrice('standard_vip'))).toBe(false);
    });
  });

  describe('no underscore patterns', () => {
    it('should return true for valid category without underscore', () => {
      expect(isTicketProduct(createMockPrice('standard'))).toBe(true);
      expect(isTicketProduct(createMockPrice('vip'))).toBe(true);
    });

    it('should return false for invalid key without underscore', () => {
      expect(isTicketProduct(createMockPrice('premium'))).toBe(false);
      expect(isTicketProduct(createMockPrice('gold'))).toBe(false);
    });
  });
});

// ============================================================================
// isWorkshopVoucher Tests
// ============================================================================
describe('isWorkshopVoucher', () => {
  const originalEnv = process.env.WORKSHOP_VOUCHER_PRODUCT_ID;

  beforeEach(() => {
    process.env.WORKSHOP_VOUCHER_PRODUCT_ID = 'prod_workshop_voucher_123';
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.WORKSHOP_VOUCHER_PRODUCT_ID = originalEnv;
    } else {
      delete process.env.WORKSHOP_VOUCHER_PRODUCT_ID;
    }
  });

  it('should return false for undefined price', () => {
    expect(isWorkshopVoucher(undefined)).toBe(false);
  });

  it('should return false when WORKSHOP_VOUCHER_PRODUCT_ID is not set', () => {
    delete process.env.WORKSHOP_VOUCHER_PRODUCT_ID;
    const price = { product: 'prod_workshop_voucher_123' } as Stripe.Price;
    expect(isWorkshopVoucher(price)).toBe(false);
  });

  it('should return true when product ID matches (string product)', () => {
    const price = { product: 'prod_workshop_voucher_123' } as Stripe.Price;
    expect(isWorkshopVoucher(price)).toBe(true);
  });

  it('should return true when product ID matches (object product)', () => {
    const price = {
      product: { id: 'prod_workshop_voucher_123' } as Stripe.Product,
    } as Stripe.Price;
    expect(isWorkshopVoucher(price)).toBe(true);
  });

  it('should return false when product ID does not match', () => {
    const price = { product: 'prod_different_123' } as Stripe.Price;
    expect(isWorkshopVoucher(price)).toBe(false);
  });
});

// ============================================================================
// handleCheckoutSessionCompleted Tests
// ============================================================================
describe('handleCheckoutSessionCompleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset default mock implementations
    mocks.mockListLineItems.mockResolvedValue({
      data: [
        {
          price: {
            lookup_key: 'standard_early_bird',
            unit_amount: 10000,
            currency: 'chf',
            id: 'price_123',
          } as Stripe.Price,
          quantity: 1,
          description: 'Conference Ticket',
        },
      ],
    });

    mocks.mockCreateTicket.mockResolvedValue({
      success: true,
      ticket: {
        id: 'ticket_123',
        email: 'test@example.com',
        ticket_type: 'standard',
        amount_paid: 10000,
        qr_code_url: 'https://example.com/qr.png',
      },
    });

    mocks.mockSupabaseEq.mockResolvedValue({ data: [], error: null });
    mocks.mockCustomersCreate.mockResolvedValue({ id: 'cus_created_123' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const createMockSession = (
    overrides: Partial<Stripe.Checkout.Session> = {}
  ): Stripe.Checkout.Session =>
    ({
      id: 'cs_test_123',
      object: 'checkout.session',
      customer: 'cus_test_123',
      customer_details: {
        email: 'test@example.com',
        name: 'John Doe',
      } as Stripe.Checkout.Session.CustomerDetails,
      amount_total: 10000,
      currency: 'chf',
      metadata: {},
      payment_intent: 'pi_test_123',
      ...overrides,
    }) as Stripe.Checkout.Session;

  describe('customer email validation', () => {
    it('should throw error when customer email is missing', async () => {
      const session = createMockSession({
        customer_details: { name: 'John Doe' } as Stripe.Checkout.Session.CustomerDetails,
      });

      await expect(handleCheckoutSessionCompleted(session)).rejects.toThrow(
        'Customer email is required'
      );
    });
  });

  describe('customer handling', () => {
    it('should use existing customer ID from session (string)', async () => {
      const session = createMockSession({ customer: 'cus_existing_123' });

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockCustomersCreate).not.toHaveBeenCalled();
    });

    it('should use existing customer ID from session (object)', async () => {
      const session = createMockSession({
        customer: { id: 'cus_existing_obj_123' } as Stripe.Customer,
      });

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockCustomersCreate).not.toHaveBeenCalled();
    });

    it('should create new customer when none exists', async () => {
      const session = createMockSession({ customer: null });

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockCustomersCreate).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'John Doe',
        metadata: {
          session_id: 'cs_test_123',
        },
      });
    });
  });

  describe('line items handling', () => {
    it('should throw error when no line items exist', async () => {
      mocks.mockListLineItems.mockResolvedValue({ data: [] });
      const session = createMockSession();

      await expect(handleCheckoutSessionCompleted(session)).rejects.toThrow(
        'No line items in session'
      );
    });

    it('should handle ticket purchases', async () => {
      const session = createMockSession();

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockCreateTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          ticketType: 'early_bird',
          ticketCategory: 'standard',
          ticketStage: 'early_bird',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        })
      );
    });
  });

  describe('voucher handling', () => {
    beforeEach(() => {
      process.env.WORKSHOP_VOUCHER_PRODUCT_ID = 'prod_voucher_123';

      mocks.mockListLineItems.mockResolvedValue({
        data: [
          {
            price: {
              product: 'prod_voucher_123',
              unit_amount: 5000,
              currency: 'chf',
              id: 'price_voucher_123',
            } as Stripe.Price,
            quantity: 2,
            description: 'Workshop Voucher',
          },
        ],
      });
    });

    it('should process workshop vouchers', async () => {
      const session = createMockSession();

      await handleCheckoutSessionCompleted(session);

      // Should be called twice (quantity of 2)
      expect(mocks.mockSendVoucherConfirmationEmail).toHaveBeenCalledTimes(2);
      expect(mocks.mockSendVoucherConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          firstName: 'John',
        })
      );
    });
  });

  describe('name parsing', () => {
    it('should parse full name correctly', async () => {
      const session = createMockSession({
        customer_details: {
          email: 'test@example.com',
          name: 'John Michael Doe',
        } as Stripe.Checkout.Session.CustomerDetails,
      });

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockCreateTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Michael Doe',
        })
      );
    });

    it('should handle single name', async () => {
      const session = createMockSession({
        customer_details: {
          email: 'test@example.com',
          name: 'Madonna',
        } as Stripe.Checkout.Session.CustomerDetails,
      });

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockCreateTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Madonna',
          lastName: '',
        })
      );
    });

    it('should use "Valued Customer" when name is missing', async () => {
      const session = createMockSession({
        customer_details: {
          email: 'test@example.com',
          name: null,
        } as unknown as Stripe.Checkout.Session.CustomerDetails,
      });

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockCreateTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Valued',
          lastName: 'Customer',
        })
      );
    });
  });

  describe('multi-attendee purchases', () => {
    it('should create tickets for multiple attendees from metadata', async () => {
      const attendees = [
        { firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
      ];

      const session = createMockSession({
        metadata: {
          attendees: JSON.stringify(attendees),
          totalTickets: '2',
        },
      });

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockCreateTicket).toHaveBeenCalledTimes(2);
      expect(mocks.mockCreateTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        })
      );
      expect(mocks.mockCreateTicket).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        })
      );
    });
  });

  describe('idempotency', () => {
    it('should skip ticket creation when tickets already exist for session', async () => {
      mocks.mockSupabaseEq.mockResolvedValue({
        data: [{ id: 'existing_ticket_1', email: 'test@example.com' }],
        error: null,
      });

      const session = createMockSession();

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockCreateTicket).not.toHaveBeenCalled();
    });
  });

  describe('newsletter subscription', () => {
    it('should add newsletter contact after ticket creation', async () => {
      const session = createMockSession();

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockAddNewsletterContact).toHaveBeenCalledWith('test@example.com', 'checkout');
    });
  });

  describe('email sending', () => {
    it('should send ticket confirmation emails', async () => {
      const session = createMockSession();

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockSendTicketConfirmationEmailsQueued).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            to: 'test@example.com',
            customerName: 'John Doe',
            ticketType: 'Early Bird',
          }),
        ])
      );
    });
  });

  describe('analytics tracking', () => {
    it('should track webhook received event', async () => {
      const session = createMockSession();

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockServerAnalyticsTrack).toHaveBeenCalledWith(
        'webhook_received',
        'cs_test_123',
        expect.objectContaining({
          webhook_source: 'stripe',
          webhook_event_type: 'checkout.session.completed',
        })
      );
    });

    it('should track ticket purchased event', async () => {
      const session = createMockSession();

      await handleCheckoutSessionCompleted(session);

      expect(mocks.mockServerAnalyticsTrack).toHaveBeenCalledWith(
        'ticket_purchased',
        'test@example.com',
        expect.objectContaining({
          ticket_category: 'standard',
          ticket_stage: 'early_bird',
        })
      );
    });
  });

  describe('error handling', () => {
    it('should track errors when ticket creation fails', async () => {
      mocks.mockCreateTicket.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const session = createMockSession();

      await expect(handleCheckoutSessionCompleted(session)).rejects.toThrow();

      expect(mocks.mockServerAnalyticsError).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Failed to create'),
        expect.any(Object)
      );
    });
  });

  describe('unrecognized products', () => {
    it('should skip unrecognized products but continue processing', async () => {
      mocks.mockListLineItems.mockResolvedValue({
        data: [
          {
            price: {
              lookup_key: 'unknown_product',
              unit_amount: 10000,
              currency: 'chf',
              id: 'price_unknown',
            } as Stripe.Price,
            quantity: 1,
            description: 'Unknown Product',
          },
        ],
      });

      const session = createMockSession();

      // Should not throw, but also not create tickets
      await handleCheckoutSessionCompleted(session);
      expect(mocks.mockCreateTicket).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// handleAsyncPaymentSucceeded Tests
// ============================================================================
describe('handleAsyncPaymentSucceeded', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.mockListLineItems.mockResolvedValue({
      data: [
        {
          price: {
            lookup_key: 'standard_early_bird',
            unit_amount: 10000,
            currency: 'chf',
          } as Stripe.Price,
          quantity: 1,
        },
      ],
    });

    mocks.mockCreateTicket.mockResolvedValue({
      success: true,
      ticket: {
        id: 'ticket_123',
        email: 'test@example.com',
        ticket_type: 'standard',
        amount_paid: 10000,
        qr_code_url: 'https://example.com/qr.png',
      },
    });

    mocks.mockSupabaseEq.mockResolvedValue({ data: [], error: null });
  });

  it('should call handleCheckoutSessionCompleted', async () => {
    const session = {
      id: 'cs_test_async_123',
      object: 'checkout.session',
      customer: 'cus_test_123',
      customer_details: {
        email: 'test@example.com',
        name: 'John Doe',
      },
      amount_total: 10000,
      currency: 'chf',
      metadata: {},
      payment_intent: 'pi_test_123',
    } as Stripe.Checkout.Session;

    await handleAsyncPaymentSucceeded(session);

    expect(mocks.mockCreateTicket).toHaveBeenCalled();
  });
});

// ============================================================================
// handleAsyncPaymentFailed Tests
// ============================================================================
describe('handleAsyncPaymentFailed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log error when payment fails', async () => {
    const session = {
      id: 'cs_test_failed_123',
      object: 'checkout.session',
      customer_details: {
        email: 'test@example.com',
      },
      amount_total: 10000,
    } as Stripe.Checkout.Session;

    // Should not throw
    await expect(handleAsyncPaymentFailed(session)).resolves.not.toThrow();
  });
});

// ============================================================================
// handlePaymentIntentSucceeded Tests
// ============================================================================
describe('handlePaymentIntentSucceeded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log payment intent succeeded', async () => {
    const paymentIntent = {
      id: 'pi_test_123',
      object: 'payment_intent',
    } as Stripe.PaymentIntent;

    // Should not throw
    await expect(handlePaymentIntentSucceeded(paymentIntent)).resolves.not.toThrow();
  });
});
